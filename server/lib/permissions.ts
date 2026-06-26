export const VALID_PERMISSIONS = [
  "dashboard.view",
  "customers.view",
  "customers.create",
  "customers.edit",
  "customers.delete",
  "orders.view",
  "orders.create",
  "orders.edit",
  "orders.delete",
  "pack_orders.view",
  "pack_orders.create",
  "inventory.view",
  "inventory.create",
  "inventory.edit",
  "production.view",
  "production.create",
  "production.edit",
  "traceability.view",
  "labels.view",
  "labels.print",
  "reports.view",
  "reports.export",
  "settings.view",
  "users.manage",
] as const;

export type PermissionKey = typeof VALID_PERMISSIONS[number];

export const ADMIN_PERMISSIONS: Record<string, boolean> = Object.fromEntries(
  VALID_PERMISSIONS.map(k => [k, true])
);

export const GENERAL_STAFF_PERMISSIONS: Record<string, boolean> = Object.fromEntries(
  VALID_PERMISSIONS.map(k => [k, k === "dashboard.view"])
);

export const PRODUCTION_STAFF_PERMISSIONS: Record<string, boolean> = Object.fromEntries(
  VALID_PERMISSIONS.map(k => [
    k,
    (["dashboard.view", "production.view", "production.create", "production.edit",
      "inventory.view", "traceability.view", "labels.view", "labels.print",
      "reports.view"] as string[]).includes(k),
  ])
);

export const INVENTORY_STAFF_PERMISSIONS: Record<string, boolean> = Object.fromEntries(
  VALID_PERMISSIONS.map(k => [
    k,
    (["dashboard.view", "inventory.view", "inventory.create", "inventory.edit",
      "traceability.view", "labels.view", "labels.print"] as string[]).includes(k),
  ])
);
