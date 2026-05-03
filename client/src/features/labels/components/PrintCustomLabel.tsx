import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer } from "lucide-react";
import {
  useLabelTemplates,
  parseLabelTemplateSettings,
  type LabelTemplate,
} from "@/features/labels/api";
import { printLayoutLabel, type LabelDataContext } from "@/lib/labelLayoutPrint";
import { printBarcodeLabel } from "@/lib/barcodePrint";
import { useToast } from "@/hooks/use-toast";

const NO_TEMPLATE = "__none__";

export default function PrintCustomLabel() {
  const { data: templates = [] } = useLabelTemplates();
  const { toast } = useToast();
  const [templateId, setTemplateId] = useState<string>(NO_TEMPLATE);
  const [productName, setProductName] = useState("");
  const [batchCode, setBatchCode] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("KG");
  const [productionDate, setProductionDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [supplierLot, setSupplierLot] = useState("");
  const [barcodeValue, setBarcodeValue] = useState("");

  const selected: LabelTemplate | undefined = useMemo(
    () => templates.find(t => t.id === templateId),
    [templates, templateId],
  );

  async function handlePrint() {
    if (!productName && !batchCode && !lotNumber) {
      toast({ title: "Missing info", description: "Enter at least a product, batch, or lot.", variant: "destructive" });
      return;
    }
    const ctx: LabelDataContext = {
      productName, batchCode, lotNumber,
      quantity, unit,
      productionDate: productionDate || null,
      expiryDate: expiryDate || null,
      supplierLot: supplierLot || null,
      barcodeValue: barcodeValue || lotNumber || batchCode,
    };

    const settings = selected ? parseLabelTemplateSettings(selected.settings) : null;

    if (settings?.layout && (settings.layout.elements?.length ?? 0) > 0) {
      await printLayoutLabel(settings.layout, ctx, productName || lotNumber || batchCode || "Custom Label");
      return;
    }

    // Fallback: legacy printer using template type (or finished_output as default).
    const labelType = selected?.labelType ?? "finished_output";
    const bc = barcodeValue || lotNumber || batchCode || productName || "LABEL";
    if (labelType === "raw_intake") {
      printBarcodeLabel({
        template: "raw_intake",
        lotNumber: lotNumber || batchCode || "—",
        barcodeValue: bc,
        itemName: productName || "—",
        quantity: quantity || "0",
        unit: unit || "",
        receivedDate: productionDate || null,
        expiryDate: expiryDate || null,
        supplierLot: supplierLot || null,
        sourceLabel: null,
        templateSettings: settings,
      });
    } else if (labelType === "batch") {
      printBarcodeLabel({
        template: "batch",
        batchCode: batchCode || lotNumber || "—",
        barcodeValue: bc,
        productName: productName || "—",
        quantity: quantity || null,
        unit: unit || null,
        productionDate: productionDate || null,
        status: null,
        templateSettings: settings,
      });
    } else {
      printBarcodeLabel({
        template: "finished_output",
        lotNumber: lotNumber || batchCode || "—",
        barcodeValue: bc,
        productName: productName || "—",
        quantity: quantity || "0",
        unit: unit || "",
        producedDate: productionDate || null,
        sourceBatch: batchCode || null,
        expiryDate: expiryDate || null,
        templateSettings: settings,
      });
    }
  }

  return (
    <Card data-testid="card-print-custom-label">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="h-5 w-5" />
          Print Custom Label
        </CardTitle>
        <CardDescription>
          Print a one-off label by entering the details below. If you pick a template that has a saved layout, that layout will be used; otherwise the standard label format is used.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label>Template</Label>
          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger data-testid="select-print-custom-template"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_TEMPLATE}>No template — standard format</SelectItem>
              {templates.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} ({t.labelType.replace("_", " ")})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Product Name" value={productName} onChange={setProductName} testId="input-print-product" />
          <Field label="Batch Code" value={batchCode} onChange={setBatchCode} testId="input-print-batch" />
          <Field label="Lot Number" value={lotNumber} onChange={setLotNumber} testId="input-print-lot" />
          <Field label="Barcode Value" value={barcodeValue} onChange={setBarcodeValue} placeholder="Defaults to lot or batch" testId="input-print-barcode" />
          <Field label="Quantity" value={quantity} onChange={setQuantity} testId="input-print-quantity" />
          <Field label="Unit" value={unit} onChange={setUnit} testId="input-print-unit" />
          <Field label="Production Date" type="date" value={productionDate} onChange={setProductionDate} testId="input-print-production-date" />
          <Field label="Expiry Date" type="date" value={expiryDate} onChange={setExpiryDate} testId="input-print-expiry-date" />
          <Field label="Supplier Lot" value={supplierLot} onChange={setSupplierLot} testId="input-print-supplier-lot" />
        </div>

        <Button onClick={handlePrint} data-testid="button-print-custom">
          <Printer className="h-4 w-4 mr-2" /> Print
        </Button>
      </CardContent>
    </Card>
  );
}

function Field({
  label, value, onChange, type, placeholder, testId,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; testId?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} type={type} placeholder={placeholder} data-testid={testId} />
    </div>
  );
}
