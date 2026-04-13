import JsBarcode from "jsbarcode";
import { format } from "date-fns";

export interface LabelData {
  lotNumber: string;
  barcodeValue: string | null;
  itemName: string;
  quantity: string;
  unit: string;
  sourceLabel?: string;
  receivedDate?: string | null;
  expiryDate?: string | null;
  supplierLot?: string | null;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    return format(new Date(dateStr), "dd/MM/yyyy");
  } catch {
    return dateStr;
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

export function printBarcodeLabel(data: LabelData): void {
  const barcodeValue = data.barcodeValue || data.lotNumber;
  const svgString = generateBarcodeSvg(barcodeValue);

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Lot Label - ${data.lotNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: "Courier New", monospace; background: #fff; }
    .label {
      border: 2px solid #111;
      padding: 10px 12px;
      width: 340px;
      page-break-inside: avoid;
    }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; }
    .lot-number { font-size: 16px; font-weight: bold; letter-spacing: 0.5px; }
    .lot-type { font-size: 10px; color: #555; border: 1px solid #999; padding: 1px 5px; border-radius: 3px; text-transform: uppercase; }
    .item-name { font-size: 14px; font-weight: bold; margin-bottom: 4px; }
    .barcode-wrap { text-align: center; margin: 6px 0; }
    .barcode-wrap svg { max-width: 100%; }
    .details { font-size: 11px; line-height: 1.7; }
    .details .row { display: flex; gap: 8px; }
    .details .label-key { color: #555; width: 70px; flex-shrink: 0; }
    .details .label-val { font-weight: bold; }
    @media print {
      html, body { margin: 0; padding: 0; }
      .label { border: 2px solid #000; }
    }
  </style>
</head>
<body>
  <div class="label">
    <div class="header">
      <div class="lot-number">${data.lotNumber}</div>
    </div>
    <div class="item-name">${data.itemName}</div>
    ${svgString ? `<div class="barcode-wrap">${svgString}</div>` : `<div style="font-size:12px;text-align:center;padding:8px;border:1px dashed #ccc;margin:6px 0;">Barcode: ${barcodeValue}</div>`}
    <div class="details">
      <div class="row">
        <span class="label-key">Quantity:</span>
        <span class="label-val">${data.quantity} ${data.unit}</span>
      </div>
      ${data.receivedDate ? `<div class="row"><span class="label-key">Received:</span><span class="label-val">${formatDate(data.receivedDate)}</span></div>` : ""}
      ${data.expiryDate ? `<div class="row"><span class="label-key">Expires:</span><span class="label-val">${formatDate(data.expiryDate)}</span></div>` : ""}
      ${data.sourceLabel ? `<div class="row"><span class="label-key">Source:</span><span class="label-val">${data.sourceLabel}</span></div>` : ""}
      ${data.supplierLot ? `<div class="row"><span class="label-key">Sup. Lot:</span><span class="label-val">${data.supplierLot}</span></div>` : ""}
    </div>
  </div>
  <script>
    window.addEventListener('load', function() { window.print(); });
  </script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=420,height=560");
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
}
