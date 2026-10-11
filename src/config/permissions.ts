// Permission catalogue from the Frontend Guide (35 strings). "*" grants everything.
export const PERMISSIONS = [
  "inventory.view",
  "inventory.edit",
  "inventory.status",
  "inventory.status.override",
  "inventory.import",
  "inventory.admin",
  "pricing.request",
  "pricing.approve",
  "sales.view",
  "sales.reserve",
  "sales.manage",
  "sales.cancel",
  "sales.docs",
  "finance.view",
  "finance.confirm",
  "finance.confirm.second",
  "finance.refund",
  "finance.reconcile",
  "handover.manage",
  "ownership.manage",
  "warranty.manage",
  "service.view",
  "service.manage",
  "service.field",
  "maint.manage",
  "facility.manage",
  "rental.view",
  "rental.manage",
  "reports.view",
  "audit.view",
  "admin.users",
  "admin.roles",
  "admin.settings",
  "integrations.manage",
  "notifications.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** An endpoint that lists several permissions accepts any one of them. */
export function hasPermission(
  granted: readonly string[] | undefined,
  required: Permission | readonly Permission[],
): boolean {
  if (!granted) return false;
  if (granted.includes("*")) return true;
  const list = typeof required === "string" ? [required] : required;
  return list.some((p) => granted.includes(p));
}
