import type { AuditLogRow } from "@/features/security/api";

const ENTITY_LINK_MAP: Record<string, (id: string) => string | null> = {
  batch: (id) => `/batches/${id}`,
  lot: (id) => `/lots/${id}`,
  order: () => `/orders`,
  customer: () => `/customers`,
  category: () => `/settings?tab=data&section=categories`,
  label_template: () => `/settings?tab=labels&section=templates`,
  product: () => `/settings?tab=production&section=fruit-codes`,
  material: () => `/inventory`,
};

export function entityLinkFor(row: AuditLogRow): string | null {
  const fn = ENTITY_LINK_MAP[row.entityType];
  if (!fn) return null;
  return fn(row.entityId);
}

function tryParse(raw: string | null): unknown {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

const ABBREV_LIMIT = 80;

function abbrev(s: string): string {
  return s.length > ABBREV_LIMIT ? s.slice(0, ABBREV_LIMIT - 1) + "…" : s;
}

function describeKeys(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj).filter(k => k !== "id");
  if (keys.length === 0) return "—";
  if (keys.length <= 4) {
    return keys.map(k => {
      const v = obj[k];
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        return `${k}=${v}`;
      }
      return k;
    }).join(", ");
  }
  return `${keys.length} fields: ${keys.slice(0, 3).join(", ")}…`;
}

/**
 * Build a short, human-readable summary from an audit log row's `changes` JSON.
 */
export function summarizeChanges(row: AuditLogRow): string {
  const parsed = tryParse(row.changes);
  if (!parsed || typeof parsed !== "object") return row.changes ? abbrev(row.changes) : "—";
  const obj = parsed as Record<string, unknown>;

  // Common patterns
  if (typeof obj.name === "string") {
    if (row.action === "delete") return `Deleted "${obj.name}"`;
    if (row.action === "create") return `Created "${obj.name}"`;
  }
  if (typeof obj.lotNumber === "string") return abbrev(`Lot ${obj.lotNumber}${obj.quantity ? ` qty ${obj.quantity}` : ""}`);
  if (typeof obj.batchCode === "string") return abbrev(`Batch ${obj.batchCode}`);
  if (typeof obj.quantity === "string" || typeof obj.quantity === "number") {
    const parts: string[] = [`qty ${obj.quantity}`];
    if (typeof obj.productId === "string") parts.push("product");
    if (typeof obj.materialId === "string") parts.push("material");
    return abbrev(parts.join(" · "));
  }
  if ("deleted" in obj && obj.deleted) return "Deleted";
  if ("active" in obj && obj.active === false) return "Deactivated";
  return abbrev(describeKeys(obj));
}
