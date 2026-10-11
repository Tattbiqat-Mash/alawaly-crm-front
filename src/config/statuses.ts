import type { Tone } from "@/components/shared/status-badge";

// State values are the API contract (Frontend Guide "State values"); colors are ours.

export const UNIT_STATUSES = ["planned", "available", "reserved", "sold", "unavailable", "hidden", "completed"] as const;
export type UnitStatus = (typeof UNIT_STATUSES)[number];
export const isUnitStatus = (v: unknown): v is UnitStatus => UNIT_STATUSES.includes(v as UnitStatus);

/** The only targets staff may set directly (reserved/sold come from reservations and sales). */
export const STAFF_STATUS_TARGETS = ["available", "unavailable", "hidden"] as const satisfies readonly UnitStatus[];

export const unitStatusTone: Record<UnitStatus, Tone> = {
  planned: "neutral",
  available: "success",
  reserved: "warning",
  sold: "primary",
  unavailable: "neutral",
  hidden: "danger",
  completed: "info",
};

export const CONSTRUCTION_STATUSES = ["planned", "under_construction", "completed"] as const;
export type ConstructionStatus = (typeof CONSTRUCTION_STATUSES)[number];
export const isConstructionStatus = (v: unknown): v is ConstructionStatus =>
  CONSTRUCTION_STATUSES.includes(v as ConstructionStatus);

export const SALE_STATUSES = ["draft", "contracted", "paid_up", "handed_over", "cancelled"] as const;
export type SaleStatus = (typeof SALE_STATUSES)[number];
export const isSaleStatus = (v: unknown): v is SaleStatus => SALE_STATUSES.includes(v as SaleStatus);
export const saleStatusTone: Record<SaleStatus, Tone> = {
  draft: "neutral",
  contracted: "info",
  paid_up: "success",
  handed_over: "primary",
  cancelled: "danger",
};

export const PRICE_CHANGE_STATUSES = ["pending", "approved", "rejected"] as const;
export type PriceChangeStatus = (typeof PRICE_CHANGE_STATUSES)[number];
export const isPriceChangeStatus = (v: unknown): v is PriceChangeStatus =>
  PRICE_CHANGE_STATUSES.includes(v as PriceChangeStatus);
export const priceChangeTone: Record<PriceChangeStatus, Tone> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

export const OWNERSHIP_SOURCES = ["sale", "transfer", "import"] as const;
export type OwnershipSource = (typeof OWNERSHIP_SOURCES)[number];
export const isOwnershipSource = (v: unknown): v is OwnershipSource => OWNERSHIP_SOURCES.includes(v as OwnershipSource);

export const STATUS_SOURCES = ["staff", "crm", "bitrix", "reservation", "sale", "system"] as const;
export type StatusSource = (typeof STATUS_SOURCES)[number];
export const isStatusSource = (v: unknown): v is StatusSource => STATUS_SOURCES.includes(v as StatusSource);

export const SERVICE_REQUEST_STATUSES = [
  "new",
  "triaged",
  "approved",
  "assigned",
  "scheduled",
  "in_progress",
  "completed",
  "closed",
  "rejected",
  "reopened",
] as const;
export type ServiceRequestStatus = (typeof SERVICE_REQUEST_STATUSES)[number];
/** Requests still being worked on from the owner's point of view. */
export const OPEN_SERVICE_REQUEST_STATUSES = [
  "new",
  "triaged",
  "approved",
  "assigned",
  "scheduled",
  "in_progress",
  "reopened",
] as const satisfies readonly ServiceRequestStatus[];

export const HANDOVER_STATUSES = ["scheduled", "inspected", "accepted", "accepted_with_snags", "closed"] as const;
export type HandoverStatus = (typeof HANDOVER_STATUSES)[number];
export const isHandoverStatus = (v: unknown): v is HandoverStatus => HANDOVER_STATUSES.includes(v as HandoverStatus);
