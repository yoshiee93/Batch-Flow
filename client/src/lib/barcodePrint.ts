import JsBarcode from "jsbarcode";
import { format } from "date-fns";
import type { LabelTemplateSettings } from "@shared/schema";

export type TemplateType = "raw_intake" | "finished_output" | "batch";

export interface RawIntakeData {
  template: "raw_intake";
  lotNumber: string;
  barcodeValue: string | null;
  itemName: string;
  quantity: string;
  unit: string;
  sourceLabel?: string | null;
  receivedDate?: string | null;
  expiryDate?: string | null;
  supplierLot?: string | null;
  templateSettings?: LabelTemplateSettings | null;
}

export interface FinishedOutputData {
  template: "finished_output";
  lotNumber: string;
  barcodeValue: string | null;
  productName: string;
  quantity: string;
  unit: string;
  producedDate?: string | null;
  sourceBatch?: string | null;
  expiryDate?: string | null;
  templateSettings?: LabelTemplateSettings | null;
}

export interface BatchLabelData {
  template: "batch";
  batchCode: string;
  barcodeValue: string | null;
  productName: string;
  quantity?: string | null;
  unit?: string | null;
  productionDate?: string | null;
  status?: string | null;
  templateSettings?: LabelTemplateSettings | null;
}

export type LabelData = RawIntakeData | FinishedOutputData | BatchLabelData;

function esc(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    return format(new Date(dateStr), "dd/MM/yyyy");
  } catch {
    return esc(dateStr);
  }
}

function generateBarcodeSvg(value: string): string {
  const svgNs = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNs, "svg");
  try {
    JsBarcode(svg, value, {
      format: "CODE128",
      width: 2,
      height: 60,
      displayValue: true,
      fontSize: 13,
      margin: 4,
      background: "#ffffff",
      lineColor: "#000000",
    });
  } catch {
    return "";
  }
  return new XMLSerializer().serializeToString(svg);
}

function baseStyles(): string {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: "Courier New", monospace; background: #fff; }
    .label {
      border: 2px solid #111;
      padding: 10px 12px;
      width: 340px;
      page-break-inside: avoid;
    }
    .label-type {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #fff;
      background: #333;
      padding: 2px 6px;
      display: inline-block;
      margin-bottom: 5px;
    }
    .lot-number { font-size: 16px; font-weight: bold; letter-spacing: 0.5px; }
    .item-name { font-size: 14px; font-weight: bold; margin-bottom: 4px; }
    .barcode-wrap { text-align: center; margin: 6px 0; }
    .barcode-wrap svg { max-width: 100%; }
    .details { font-size: 11px; line-height: 1.7; }
    .details .row { display: flex; gap: 8px; }
    .details .label-key { color: #555; width: 76px; flex-shrink: 0; }
    .details .label-val { font-weight: bold; }
    .made-in-au { font-size: 10px; text-align: center; margin-top: 6px; border-top: 1px solid #ccc; padding-top: 4px; }
    @media print {
      html, body { margin: 0; padding: 0; }
      .label { border: 2px solid #000; }
    }
  `;
}

function printWindow(title: string, body: string): void {
  const win = window.open("", "_blank", "width=420,height=580");
  if (!win) return;
  win.document.open();
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${esc(title)}</title>
  <style>${baseStyles()}</style>
</head>
<body>
  ${body}
  <script>window.addEventListener('load', function() { window.print(); });<\/script>
</body>
</html>`);
  win.document.close();
}

function rowHtml(key: string, val: string): string {
  return val
    ? `<div class="row"><span class="label-key">${esc(key)}</span><span class="label-val">${esc(val)}</span></div>`
    : "";
}

function barcodeSection(value: string): string {
  const svg = generateBarcodeSvg(value);
  return svg
    ? `<div class="barcode-wrap">${svg}</div>`
    : `<div style="font-size:12px;text-align:center;padding:8px;border:1px dashed #ccc;margin:6px 0;">Barcode: ${esc(value)}</div>`;
}

function show(flag: boolean | undefined): boolean {
  return flag === undefined || flag === true;
}

function printRawIntakeLabel(data: RawIntakeData): void {
  const bc = data.barcodeValue || data.lotNumber;
  const s = data.templateSettings;
  printWindow(`Raw Intake - ${data.lotNumber}`, `
  <div class="label">
    <span class="label-type">Raw Intake</span>
    <div class="lot-number">${esc(data.lotNumber)}</div>
    <div class="item-name">${esc(data.itemName)}</div>
    ${barcodeSection(bc)}
    <div class="details">
      ${show(s?.showQuantity) ? rowHtml("Qty:", `${esc(data.quantity)} ${esc(data.unit)}`) : ""}
      ${show(s?.showReceivedDate) ? rowHtml("Received:", formatDate(data.receivedDate)) : ""}
      ${show(s?.showExpiryDate) ? rowHtml("Expires:", formatDate(data.expiryDate)) : ""}
      ${show(s?.showSource) ? rowHtml("Source:", data.sourceLabel ?? "") : ""}
      ${show(s?.showSupplierLot) ? rowHtml("Sup. Lot:", data.supplierLot ?? "") : ""}
    </div>
    ${show(s?.showMadeInAustralia) ? '<div class="made-in-au">Made in Australia</div>' : ""}
  </div>`);
}

function printFinishedOutputLabel(data: FinishedOutputData): void {
  const bc = data.barcodeValue || data.lotNumber;
  const s = data.templateSettings;
  printWindow(`Output Lot - ${data.lotNumber}`, `
  <div class="label">
    <span class="label-type">Finished Output</span>
    <div class="lot-number">${esc(data.lotNumber)}</div>
    <div class="item-name">${esc(data.productName)}</div>
    ${barcodeSection(bc)}
    <div class="details">
      ${show(s?.showQuantity) ? rowHtml("Qty:", `${esc(data.quantity)} ${esc(data.unit)}`) : ""}
      ${show(s?.showProductionDate) ? rowHtml("Production Date:", formatDate(data.producedDate)) : ""}
      ${show(s?.showBatchCode) ? rowHtml("Batch No:", data.sourceBatch ?? "") : ""}
      ${show(s?.showExpiryDate) ? rowHtml("Best Before:", formatDate(data.expiryDate)) : ""}
    </div>
    ${show(s?.showMadeInAustralia) ? '<div class="made-in-au">Made in Australia</div>' : ""}
  </div>`);
}

function printBatchLabel(data: BatchLabelData): void {
  const bc = data.barcodeValue || data.batchCode;
  const s = data.templateSettings;
  const statusLabel = data.status
    ? data.status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
    : "";
  printWindow(`Batch - ${data.batchCode}`, `
  <div class="label">
    <span class="label-type">Batch</span>
    <div class="lot-number">${esc(data.batchCode)}</div>
    <div class="item-name">${esc(data.productName)}</div>
    ${barcodeSection(bc)}
    <div class="details">
      ${show(s?.showQuantity) && data.quantity ? rowHtml("Qty:", `${esc(data.quantity)} ${esc(data.unit ?? 'KG')}`) : ""}
      ${show(s?.showProductionDate) ? rowHtml("Date:", formatDate(data.productionDate)) : ""}
      ${rowHtml("Status:", statusLabel)}
    </div>
    ${show(s?.showMadeInAustralia) ? '<div class="made-in-au">Made in Australia</div>' : ""}
  </div>`);
}

export function printBarcodeLabel(data: LabelData): void {
  switch (data.template) {
    case "raw_intake": return printRawIntakeLabel(data);
    case "finished_output": return printFinishedOutputLabel(data);
    case "batch": return printBatchLabel(data);
  }
}
