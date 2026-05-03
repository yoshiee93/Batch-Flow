import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import { format } from "date-fns";
import type { LabelLayout, LabelElement, LabelFieldKey } from "@shared/schema";

export interface LabelDataContext {
  productName?: string | null;
  lotNumber?: string | null;
  batchCode?: string | null;
  quantity?: string | null;
  unit?: string | null;
  productionDate?: string | null;
  expiryDate?: string | null;
  receivedDate?: string | null;
  supplierLot?: string | null;
  source?: string | null;
  barcodeValue?: string | null;
  customerName?: string | null;
}

function esc(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return "";
  try {
    return format(new Date(s), "dd/MM/yyyy");
  } catch {
    return s;
  }
}

export function resolveField(key: LabelFieldKey, ctx: LabelDataContext): string {
  switch (key) {
    case "productName": return ctx.productName ?? "";
    case "lotNumber": return ctx.lotNumber ?? "";
    case "batchCode": return ctx.batchCode ?? "";
    case "quantity": return ctx.quantity ?? "";
    case "unit": return ctx.unit ?? "";
    case "quantityWithUnit": {
      const q = ctx.quantity ?? "";
      const u = ctx.unit ?? "";
      return q ? `${q}${u ? ` ${u}` : ""}` : "";
    }
    case "productionDate": return fmtDate(ctx.productionDate);
    case "expiryDate": return fmtDate(ctx.expiryDate);
    case "receivedDate": return fmtDate(ctx.receivedDate);
    case "supplierLot": return ctx.supplierLot ?? "";
    case "source": return ctx.source ?? "";
    case "barcodeValue": return ctx.barcodeValue ?? "";
    case "customerName": return ctx.customerName ?? "";
  }
}

export function resolveBarcodeSource(
  source: "barcodeValue" | "lotNumber" | "batchCode",
  ctx: LabelDataContext,
): string {
  if (source === "barcodeValue") return ctx.barcodeValue ?? ctx.lotNumber ?? ctx.batchCode ?? "";
  if (source === "lotNumber") return ctx.lotNumber ?? "";
  return ctx.batchCode ?? "";
}

export function generateBarcodeSvg(value: string, displayValue = true, height = 60): string {
  const svgNs = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNs, "svg");
  try {
    JsBarcode(svg, value || " ", {
      format: "CODE128",
      width: 2,
      height,
      displayValue,
      fontSize: 13,
      margin: 0,
      background: "#ffffff",
      lineColor: "#000000",
    });
  } catch {
    return "";
  }
  return new XMLSerializer().serializeToString(svg);
}

export async function generateQrSvg(value: string, sizePx = 80): Promise<string> {
  try {
    return await QRCode.toString(value || " ", {
      type: "svg",
      margin: 0,
      width: sizePx,
      errorCorrectionLevel: "M",
    });
  } catch {
    return "";
  }
}

const DEFAULT_W = 60;
const DEFAULT_H = 40;

export function defaultLayout(): LabelLayout {
  return { version: 1, width: DEFAULT_W, height: DEFAULT_H, unit: "mm", elements: [] };
}

let elementCounter = 0;
function nextElementId(): string {
  elementCounter += 1;
  return `el-${Date.now().toString(36)}-${elementCounter}`;
}

export function createElement(type: LabelElement["type"]): LabelElement {
  const id = nextElementId();
  const base = { id, x: 4, y: 4, width: 40, height: 8, rotation: 0 as const };
  switch (type) {
    case "text":
      return { ...base, type: "text", text: "Label Text", fontSize: 12, align: "left" };
    case "field":
      return { ...base, type: "field", fieldKey: "productName", fontSize: 12, align: "left" };
    case "barcode":
      return { ...base, type: "barcode", width: 50, height: 16, source: "barcodeValue", showText: true };
    case "qr":
      return { ...base, type: "qr", width: 18, height: 18, source: "barcodeValue" };
    case "line":
      return { ...base, type: "line", width: 50, height: 0.5, stroke: 0.5 };
    case "box":
      return { ...base, type: "box", width: 30, height: 16, stroke: 0.5 };
  }
}

export function fieldLabel(key: LabelFieldKey): string {
  switch (key) {
    case "productName": return "Product Name";
    case "lotNumber": return "Lot Number";
    case "batchCode": return "Batch Code";
    case "quantity": return "Quantity";
    case "unit": return "Unit";
    case "quantityWithUnit": return "Quantity + Unit";
    case "productionDate": return "Production Date";
    case "expiryDate": return "Expiry Date";
    case "receivedDate": return "Received Date";
    case "supplierLot": return "Supplier Lot";
    case "source": return "Source / Supplier";
    case "barcodeValue": return "Barcode Value";
    case "customerName": return "Customer Name";
  }
}

export const ALL_FIELD_KEYS: LabelFieldKey[] = [
  "productName", "lotNumber", "batchCode", "quantity", "unit", "quantityWithUnit",
  "productionDate", "expiryDate", "receivedDate", "supplierLot", "source",
  "barcodeValue", "customerName",
];

export const SAMPLE_CONTEXT: LabelDataContext = {
  productName: "Strawberry Whole",
  lotNumber: "FG-260503-0001",
  batchCode: "RC4261156",
  quantity: "27.000",
  unit: "KG",
  productionDate: new Date().toISOString(),
  expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
  receivedDate: new Date().toISOString(),
  supplierLot: "SUP-12345",
  source: "Acme Farms",
  barcodeValue: "FG-260503-0001",
  customerName: "Grain and Bake",
};

async function elementHtml(el: LabelElement, ctx: LabelDataContext): Promise<string> {
  const wrapStyle = `position:absolute;left:${el.x}mm;top:${el.y}mm;width:${el.width}mm;height:${el.height}mm;` +
    (el.rotation ? `transform:rotate(${el.rotation}deg);transform-origin:center center;` : "");
  switch (el.type) {
    case "text": {
      const align = el.align ?? "left";
      const fs = el.fontSize ?? 12;
      const weight = el.bold ? 700 : 400;
      return `<div style="${wrapStyle}font-size:${fs}px;text-align:${align};font-weight:${weight};line-height:1.1;overflow:hidden;">${esc(el.text)}</div>`;
    }
    case "field": {
      const align = el.align ?? "left";
      const fs = el.fontSize ?? 12;
      const weight = el.bold ? 700 : 400;
      const value = resolveField(el.fieldKey, ctx);
      const text = el.prefix ? `${el.prefix}${value}` : value;
      return `<div style="${wrapStyle}font-size:${fs}px;text-align:${align};font-weight:${weight};line-height:1.1;overflow:hidden;">${esc(text)}</div>`;
    }
    case "barcode": {
      const value = resolveBarcodeSource(el.source, ctx);
      const heightPx = Math.max(20, el.height * 3);
      const svg = generateBarcodeSvg(value, !!el.showText, heightPx);
      const inner = svg
        ? `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">${svg.replace(/<svg([^>]*)>/, '<svg$1 style="max-width:100%;max-height:100%;width:100%;height:100%;" preserveAspectRatio="none">')}</div>`
        : `<div style="font-size:9px;text-align:center;">[barcode]</div>`;
      return `<div style="${wrapStyle}overflow:hidden;">${inner}</div>`;
    }
    case "qr": {
      const value = resolveBarcodeSource(el.source, ctx);
      const sizePx = Math.max(24, Math.min(el.width, el.height) * 4);
      const svg = await generateQrSvg(value, sizePx);
      const inner = svg
        ? `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">${svg.replace(/<svg([^>]*)>/, '<svg$1 style="width:100%;height:100%;" preserveAspectRatio="xMidYMid meet">')}</div>`
        : `<div style="font-size:9px;text-align:center;">[qr]</div>`;
      return `<div style="${wrapStyle}overflow:hidden;">${inner}</div>`;
    }
    case "line": {
      const stroke = el.stroke ?? 0.5;
      return `<div style="${wrapStyle}border-top:${stroke}mm solid #000;height:0;"></div>`;
    }
    case "box": {
      const stroke = el.stroke ?? 0.5;
      return `<div style="${wrapStyle}border:${stroke}mm solid #000;"></div>`;
    }
  }
}

export async function printLayoutLabel(
  layout: LabelLayout,
  ctx: LabelDataContext,
  title = "Label",
): Promise<void> {
  const w = layout.width ?? DEFAULT_W;
  const h = layout.height ?? DEFAULT_H;
  const elements = layout.elements ?? [];
  const parts = await Promise.all(elements.map(el => elementHtml(el, ctx)));
  const body = `<div class="label">${parts.join("")}</div>`;
  const win = window.open("", "_blank", `width=${Math.round(w * 4) + 80},height=${Math.round(h * 4) + 200}`);
  if (!win) return;
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${esc(title)}</title>
<style>
  @page { size: ${w}mm ${h}mm; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background:#fff; font-family: "Helvetica Neue", Arial, sans-serif; color:#000; }
  body { padding: 8px; }
  .label { position: relative; width: ${w}mm; height: ${h}mm; background:#fff; overflow:hidden; border:1px dashed #999; }
  @media print {
    body { padding: 0; }
    .label { border: none; }
  }
</style>
</head>
<body>
  ${body}
  <script>window.addEventListener('load', function(){ setTimeout(function(){ window.print(); }, 250); });<\/script>
</body>
</html>`;
  win.document.open();
  win.document.write(html);
  win.document.close();
}
