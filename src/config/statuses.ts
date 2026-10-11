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

export const RESERVATION_STATES = ["pending", "active", "converted", "expired", "cancelled"] as const;
export type ReservationState = (typeof RESERVATION_STATES)[number];
export const isReservationState = (v: unknown): v is ReservationState => RESERVATION_STATES.includes(v as ReservationState);
export const reservationStateTone: Record<ReservationState, Tone> = {
  pending: "warning",
  active: "info",
  converted: "success",
  expired: "neutral",
  cancelled: "danger",
};
/** Staff can extend or cancel only open reservations. */
export const OPEN_RESERVATION_STATES = ["pending", "active"] as const satisfies readonly ReservationState[];

export const PAYMENT_STATUSES = [
  "initiated",
  "pending",
  "pending_second_approval",
  "succeeded",
  "failed",
  "review",
  "refunded",
  "recorded",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export const isPaymentStatus = (v: unknown): v is PaymentStatus => PAYMENT_STATUSES.includes(v as PaymentStatus);
/** Only `succeeded` is money received; everything else is shown as not (yet) paid. */
export const paymentStatusTone: Record<PaymentStatus, Tone> = {
  initiated: "neutral",
  pending: "warning",
  pending_second_approval: "warning",
  succeeded: "success",
  failed: "danger",
  review: "warning",
  refunded: "info",
  recorded: "info",
};

export const PAYMENT_METHODS = ["bank_transfer", "cash", "cheque"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const isPaymentMethod = (v: unknown): v is PaymentMethod => PAYMENT_METHODS.includes(v as PaymentMethod);

export const DOCUMENT_TYPES = ["contract", "annex", "id", "other"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];
export const isDocumentType = (v: unknown): v is DocumentType => DOCUMENT_TYPES.includes(v as DocumentType);

/** Forward path of a sale (cancelled is a side exit). */
export const SALE_FLOW = ["draft", "contracted", "paid_up", "handed_over"] as const satisfies readonly SaleStatus[];

export const installmentTone = (status: string, state: string | null): Tone =>
  state === "overdue" ? "danger" : state === "waived" || state === "refunded" ? "neutral" : status === "paid" ? "success" : status === "canceled" ? "neutral" : "warning";
