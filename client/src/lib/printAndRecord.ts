import { fetchLabelTemplate, parseLabelTemplateSettings, type PrintLabelKind, type RecordPrintInput } from "@/features/labels/api";
import { printBarcodeLabel, type LabelData } from "@/lib/barcodePrint";
import { printLayoutLabel, type LabelDataContext } from "@/lib/labelLayoutPrint";

type ToastFn = (opts: { title: string; description?: string; variant?: "default" | "destructive" }) => void;
type RecordFn = (data: RecordPrintInput) => void;

export function ctxFromLegacy(d: LabelData): LabelDataContext {
  switch (d.template) {
    case "raw_intake":
      return {
        productName: d.itemName,
        lotNumber: d.lotNumber,
        barcodeValue: d.barcodeValue ?? d.lotNumber,
        quantity: d.quantity,
        unit: d.unit,
        receivedDate: d.receivedDate ?? null,
        expiryDate: d.expiryDate ?? null,
        supplierLot: d.supplierLot ?? null,
        source: d.sourceLabel ?? null,
      };
    case "finished_output":
      return {
        productName: d.productName,
        lotNumber: d.lotNumber,
        barcodeValue: d.barcodeValue ?? d.lotNumber,
        quantity: d.quantity,
        unit: d.unit,
        productionDate: d.producedDate ?? null,
        batchCode: d.sourceBatch ?? null,
        expiryDate: d.expiryDate ?? null,
      };
    case "batch":
      return {
        productName: d.productName,
        batchCode: d.batchCode,
        barcodeValue: d.barcodeValue ?? d.batchCode,
        quantity: d.quantity ?? null,
        unit: d.unit ?? null,
        productionDate: d.productionDate ?? null,
      };
  }
}

export interface PrintAndRecordParams {
  kind: PrintLabelKind;
  customerId?: string | null;
  ctx?: LabelDataContext;
  legacyData: LabelData;
  templateTypeForResolve?: "raw_intake" | "finished_output" | "batch";
  entityType?: "lot" | "batch" | null;
  entityId?: string | null;
  displayName: string;
  secondaryName?: string | null;
  toast: ToastFn;
  recordPrint: RecordFn;
  onAfterPrint?: () => void;
}

export async function printAndRecord(params: PrintAndRecordParams): Promise<void> {
  const {
    kind, customerId, legacyData, templateTypeForResolve,
    entityType, entityId, displayName, secondaryName,
    toast, recordPrint, onAfterPrint,
  } = params;
  const ctx = params.ctx ?? ctxFromLegacy(legacyData);

  const resolveType = templateTypeForResolve ?? (kind === "custom" ? "finished_output" : kind);
  const template = await fetchLabelTemplate(resolveType, customerId ?? null);

  if (!template && kind !== "custom") {
    toast({
      title: "Template no longer available",
      description: "Pick a custom template in Settings → Labels.",
      variant: "destructive",
    });
    return;
  }

  const settings = template ? parseLabelTemplateSettings(template.settings) : null;
  const layout = settings?.layout;
  const hasLayout = !!layout && (layout.elements?.length ?? 0) > 0;

  if (hasLayout && layout) {
    await printLayoutLabel(layout, ctx, displayName);
  } else {
    const dataWithSettings: LabelData = { ...legacyData, templateSettings: settings ?? undefined };
    printBarcodeLabel(dataWithSettings);
  }

  recordPrint({
    labelKind: kind,
    templateId: template?.id ?? null,
    templateName: template?.name ?? null,
    entityType: entityType ?? null,
    entityId: entityId ?? null,
    displayName,
    secondaryName: secondaryName ?? null,
    snapshot: {
      ctx,
      legacyData,
      templateTypeForResolve: resolveType,
      customerId: customerId ?? null,
    } as Record<string, unknown>,
  });

  onAfterPrint?.();
}

export interface ReprintFromHistoryParams {
  snapshot: Record<string, unknown>;
  labelKind: PrintLabelKind;
  displayName: string;
  secondaryName?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  toast: ToastFn;
  recordPrint: RecordFn;
}

export async function reprintFromHistory(params: ReprintFromHistoryParams): Promise<void> {
  const { snapshot, labelKind, displayName, secondaryName, entityType, entityId, toast, recordPrint } = params;
  const ctx = (snapshot.ctx as LabelDataContext) ?? {};
  const legacyData = snapshot.legacyData as LabelData | undefined;
  const resolveType = (snapshot.templateTypeForResolve as "raw_intake" | "finished_output" | "batch" | undefined)
    ?? (labelKind === "custom" ? "finished_output" : labelKind);
  const customerId = (snapshot.customerId as string | null | undefined) ?? null;

  if (!legacyData) {
    toast({ title: "Cannot reprint", description: "Snapshot data missing.", variant: "destructive" });
    return;
  }

  const template = await fetchLabelTemplate(resolveType, customerId);
  if (!template && labelKind !== "custom") {
    toast({
      title: "Template no longer available",
      description: "Pick a custom template in Settings → Labels.",
      variant: "destructive",
    });
    return;
  }

  const settings = template ? parseLabelTemplateSettings(template.settings) : null;
  const layout = settings?.layout;
  const hasLayout = !!layout && (layout.elements?.length ?? 0) > 0;

  if (hasLayout && layout) {
    await printLayoutLabel(layout, ctx, displayName);
  } else {
    const dataWithSettings: LabelData = { ...legacyData, templateSettings: settings ?? undefined };
    printBarcodeLabel(dataWithSettings);
  }

  recordPrint({
    labelKind,
    templateId: template?.id ?? null,
    templateName: template?.name ?? null,
    entityType: entityType ?? null,
    entityId: entityId ?? null,
    displayName,
    secondaryName: secondaryName ?? null,
    snapshot: {
      ctx,
      legacyData,
      templateTypeForResolve: resolveType,
      customerId,
    } as Record<string, unknown>,
  });
}
