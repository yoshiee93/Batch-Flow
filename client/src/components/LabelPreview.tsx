import { useState } from 'react';
import { ChevronDown, ChevronUp, Eye, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLabelTemplate, parseLabelTemplateSettings, type LabelTemplateType } from '@/features/labels/api';
import type { LabelTemplateSettings } from '@shared/schema';

function show(flag: boolean | undefined): boolean {
  return flag === undefined || flag === true;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yyyy = dt.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export interface BatchPreviewData {
  type: 'batch';
  batchCode: string;
  barcodeValue: string | null;
  productName: string;
  quantity?: string | null;
  unit?: string | null;
  productionDate?: string | null;
  status?: string | null;
}

export interface RawIntakePreviewData {
  type: 'raw_intake';
  lotNumber: string;
  barcodeValue: string | null;
  itemName: string;
  quantity: string;
  unit: string;
  sourceLabel?: string | null;
  receivedDate?: string | null;
  expiryDate?: string | null;
  supplierLot?: string | null;
}

export interface FinishedOutputPreviewData {
  type: 'finished_output';
  lotNumber: string;
  barcodeValue: string | null;
  productName: string;
  quantity: string;
  unit: string;
  producedDate?: string | null;
  sourceBatch?: string | null;
  expiryDate?: string | null;
}

export type PreviewData = BatchPreviewData | RawIntakePreviewData | FinishedOutputPreviewData;

interface LabelPreviewProps {
  labelType: LabelTemplateType;
  customerId?: string | null;
  data: PreviewData;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-1.5 text-[9px] leading-tight" data-testid={`preview-row-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
      <span className="text-muted-foreground shrink-0 w-[55px]">{label}</span>
      <span className="font-semibold truncate">{value}</span>
    </div>
  );
}

function PreviewContent({ data, settings }: { data: PreviewData; settings: LabelTemplateSettings }) {
  const typeLabel = data.type === 'batch' ? 'Batch' : data.type === 'raw_intake' ? 'Raw Intake' : 'Finished Output';

  const identifier = data.type === 'batch' ? (data as BatchPreviewData).batchCode : (data as RawIntakePreviewData | FinishedOutputPreviewData).lotNumber;
  const name = data.type === 'raw_intake' ? (data as RawIntakePreviewData).itemName : (data as BatchPreviewData | FinishedOutputPreviewData).productName;
  const barcodeVal = data.barcodeValue || identifier;

  return (
    <div className="border-2 border-gray-800 rounded-sm p-2 w-[200px] bg-white font-mono" data-testid="label-preview-card">
      <div className="bg-gray-800 text-white text-[7px] uppercase tracking-wider px-1 py-0.5 inline-block mb-1">
        {typeLabel}
      </div>
      <div className="text-[11px] font-bold tracking-wide leading-tight">{identifier}</div>
      <div className="text-[10px] font-bold mb-1 leading-tight">{name}</div>

      <div className="text-center py-1 my-1 border border-dashed border-gray-300 rounded-sm">
        <div className="text-[7px] text-muted-foreground tracking-widest">||||| BARCODE |||||</div>
        {show(settings.showBarcodeText) && (
          <div className="text-[7px] text-muted-foreground mt-0.5 font-mono">{barcodeVal}</div>
        )}
      </div>

      <div className="space-y-0.5">
        {data.type === 'raw_intake' && (() => {
          const d = data as RawIntakePreviewData;
          return (
            <>
              {show(settings.showQuantity) && <DetailRow label="Qty:" value={`${d.quantity} ${d.unit}`} />}
              {show(settings.showReceivedDate) && <DetailRow label="Received:" value={fmtDate(d.receivedDate)} />}
              {show(settings.showExpiryDate) && <DetailRow label="Expires:" value={fmtDate(d.expiryDate)} />}
              {show(settings.showSource) && <DetailRow label="Source:" value={d.sourceLabel ?? ''} />}
              {show(settings.showSupplierLot) && <DetailRow label="Sup. Lot:" value={d.supplierLot ?? ''} />}
            </>
          );
        })()}

        {data.type === 'finished_output' && (() => {
          const d = data as FinishedOutputPreviewData;
          return (
            <>
              {show(settings.showQuantity) && <DetailRow label="Qty:" value={`${d.quantity} ${d.unit}`} />}
              {show(settings.showProductionDate) && <DetailRow label="Production Date:" value={fmtDate(d.producedDate)} />}
              {show(settings.showBatchCode) && <DetailRow label="Batch No:" value={d.sourceBatch ?? ''} />}
              {show(settings.showExpiryDate) && <DetailRow label="Best Before:" value={fmtDate(d.expiryDate)} />}
            </>
          );
        })()}

        {data.type === 'batch' && (() => {
          const d = data as BatchPreviewData;
          const statusLabel = d.status
            ? d.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
            : '';
          return (
            <>
              {show(settings.showQuantity) && d.quantity && <DetailRow label="Qty:" value={`${d.quantity} ${d.unit ?? 'KG'}`} />}
              {show(settings.showProductionDate) && <DetailRow label="Date:" value={fmtDate(d.productionDate)} />}
              {statusLabel && <DetailRow label="Status:" value={statusLabel} />}
            </>
          );
        })()}
      </div>

      {show(settings.showMadeInAustralia) && (
        <div className="text-center text-[7px] mt-1 pt-1 border-t border-gray-300 text-muted-foreground">
          Made in Australia
        </div>
      )}
    </div>
  );
}

export default function LabelPreview({ labelType, customerId, data }: LabelPreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const { data: template, isLoading } = useLabelTemplate(labelType, customerId);

  if (isLoading) return null;

  const settings = template ? parseLabelTemplateSettings(template.settings) : null;
  const hasLayout = settings?.layout && (settings.layout.elements?.length ?? 0) > 0;

  if (hasLayout) {
    return (
      <div className="w-full text-center py-2" data-testid="label-preview-custom-layout">
        <span className="text-[10px] text-muted-foreground">Preview not available for custom layout templates</span>
      </div>
    );
  }

  return (
    <div className="w-full" data-testid="label-preview-section">
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-between text-xs text-muted-foreground h-7 px-2"
        onClick={() => setExpanded(!expanded)}
        data-testid="button-toggle-label-preview"
      >
        <span className="flex items-center gap-1.5">
          <Eye className="h-3 w-3" />
          Label Preview
          {template && (
            <span className="text-[10px] font-normal opacity-70">· {template.name}</span>
          )}
        </span>
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </Button>
      {expanded && (
        <div className="flex justify-center pt-2 pb-1">
          {settings ? (
            <PreviewContent data={data} settings={settings} />
          ) : (
            <div className="flex flex-col items-center gap-1.5 py-3 text-muted-foreground" data-testid="label-preview-no-template">
              <Tag className="h-4 w-4" />
              <span className="text-xs">No template configured</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
