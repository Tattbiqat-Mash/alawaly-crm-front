import { ownerEndpoints as ep } from "@/config/endpoints";
import type { OwnerHandover, OwnerInstallment, OwnerNotification, OwnerSale, OwnerUnit } from "@/features/owner-home/types";
import type { Mandate, Statement } from "@/features/rentals/api";
import type { ServiceAttachment, ServiceEvent, ServiceRequest, Visit } from "@/features/service/api";
import { ownerApi } from "@/lib/api/client";
import { unwrapList, type Envelope, type ListEnvelope } from "@/lib/api/envelope";
import { toApiError } from "@/lib/api/errors";
import { uploadMultipart } from "@/lib/api/files";
import { idempotencyHeader } from "@/lib/api/idempotency";
import { MAX_PAGE_SIZE, toSearchParams, type ListParams } from "@/lib/api/params";

// Owner-scoped shapes from the Frontend Guide (GET /owner/*). Every call goes through the owner
// BFF, so the API only ever returns the signed-in owner's own records (404 otherwise).

export type Eligibility = {
  unit_id: number;
  after_sales: boolean;
  warranty: boolean;
  reasons: string[];
  warranties: { id: number; category: string; starts_on: string; expires_on: string }[];
};

export type OwnerUnitDetail = OwnerUnit & {
  floor_num: number | null;
  rooms: number | null;
  bathrooms: number | null;
  total_area: string | null;
  sale: { id: number; status: string; price_agreed: string | null; contracted_at: string | null } | null;
  eligibility: Eligibility | null;
};

export type Availability = { unit_id: number; available: boolean; status: string; reasons: string[]; reservation_amount: string | null; hold_hours: number | null };

export type OwnerReservation = {
  id: number;
  unit_id: number;
  state: string;
  status: string;
  expires_at: string | null;
  payment_status: string | null;
  payment_amount: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
};

export type InitiatedOwnerPayment = {
  transaction: { id: number; reservation_id: number | null; provider: string; amount: string; currency: string; status: string; created_at: string };
  session: { mode: string; instructions?: string | null; url?: string | null } | null;
};

/** One installment with its transactions; the status is server-verified. */
export type OwnerPayment = {
  id: number;
  amount: string;
  status: string;
  paid_at: string | null;
  transactions: { id: number; provider: string; type: string; amount: string; status: string; created_at: string }[];
};

export type OwnerHandoverDetail = OwnerHandover & {
  inspected_at: string | null;
  notes: string | null;
  items?: { id: number; area: string; description: string; severity: string; status: string; resolved_at: string | null }[];
};

export type OwnerWarranty = { id: number; unit_id: number; category: string; name_ar: string | null; name_en: string | null; starts_on: string; expires_on: string };

export type OwnerRequestDetail = ServiceRequest & { events?: ServiceEvent[]; visits?: Visit[]; attachments?: ServiceAttachment[] };

export type NewServiceRequest = { unit_id: number; type: "paid" | "facility"; category: string; priority: string; title: string; description?: string };
export type NewWarrantyClaim = { unit_id: number; category: string; title: string; description?: string };

export type { Mandate as OwnerMandate, OwnerInstallment, OwnerNotification, OwnerSale, OwnerUnit, Statement as OwnerStatement };

const list = <T>(path: string, params: ListParams = {}) => ownerApi.get<ListEnvelope<T>>(path, { params: toSearchParams(params) }).then((r) => unwrapList(r.data));
const data = <T>(p: Promise<{ data: Envelope<T> }>) => p.then((r) => r.data.data);
/** Recorded examples shorten long lists with a "… N items" note; real data has none. */
const realCapabilities = (m: Mandate): Mandate => ({ ...m, capabilities: (m.capabilities ?? []).filter((c) => !c.startsWith("…")) });

export const ownerPortalApi = {
  units: () => list<OwnerUnit>(ep.units, { pageSize: MAX_PAGE_SIZE }),
  unit: (id: number) => data(ownerApi.get<Envelope<OwnerUnitDetail>>(ep.unit(id))),
  eligibility: (id: number) => data(ownerApi.get<Envelope<Eligibility>>(ep.unitEligibility(id))),
  availability: (id: number) => data(ownerApi.get<Envelope<Availability>>(ep.unitAvailability(id))),

  reservations: () => list<OwnerReservation>(ep.reservations, { pageSize: MAX_PAGE_SIZE }),
  reserve: (unitId: number, key: string) => data(ownerApi.post<Envelope<OwnerReservation>>(ep.reservations, { unit_id: unitId }, { headers: idempotencyHeader(key) })),
  cancelReservation: (id: number) => data(ownerApi.post<Envelope<OwnerReservation>>(ep.reservationCancel(id))),
  /** Only reservation fees can be started by the owner (guide); provider "offline" until a gateway is chosen. */
  initiateReservationPayment: (reservationId: number, key: string) =>
    data(ownerApi.post<Envelope<InitiatedOwnerPayment>>(ep.paymentInitiate, { provider: "offline", reservation_id: reservationId }, { headers: idempotencyHeader(key) })),
  payment: (id: number) => data(ownerApi.get<Envelope<OwnerPayment>>(ep.payment(id))),

  sales: () => list<OwnerSale>(ep.sales, { pageSize: MAX_PAGE_SIZE }).then((p) => p.items),
  installments: (saleId: number) => list<OwnerInstallment>(ep.saleInstallments(saleId)).then((p) => p.items),
  /** null while the sale has no handover yet (404). */
  handover: (saleId: number) =>
    data(ownerApi.get<Envelope<OwnerHandoverDetail>>(ep.saleHandover(saleId))).catch((err: unknown) => {
      if (toApiError(err).code === "NOT_FOUND") return null;
      throw err;
    }),
  acceptHandover: (id: number) => data(ownerApi.post<Envelope<OwnerHandoverDetail>>(ep.handoverAccept(id))),

  warranties: () => list<OwnerWarranty>(ep.warranties, { pageSize: MAX_PAGE_SIZE }),

  requests: (status: readonly string[] | null) => list<ServiceRequest>(ep.serviceRequests, { pageSize: MAX_PAGE_SIZE, filter: { status } }),
  request: (id: number) => data(ownerApi.get<Envelope<OwnerRequestDetail>>(ep.serviceRequest(id))),
  createRequest: (body: NewServiceRequest, key: string) => data(ownerApi.post<Envelope<ServiceRequest>>(ep.serviceRequests, body, { headers: idempotencyHeader(key) })),
  createWarrantyClaim: (body: NewWarrantyClaim, key: string) => data(ownerApi.post<Envelope<ServiceRequest>>(ep.warrantyClaims, body, { headers: idempotencyHeader(key) })),
  attachPhoto: (id: number, file: File, onProgress?: (percent: number) => void) =>
    uploadMultipart<ServiceAttachment>(ownerApi, ep.serviceRequestAttachments(id), { file }, { onProgress }),
  attachmentLink: (id: number, attId: number) => ownerApi.get<Envelope<{ url: string; expires_in: number }>>(ep.serviceRequestAttachmentLink(id, attId)).then((r) => r.data),
  feedback: (id: number, body: { rating: number; comment?: string }) => data(ownerApi.post<Envelope<ServiceRequest>>(ep.serviceRequestFeedback(id), body)),
  reopen: (id: number, reason: string) => data(ownerApi.post<Envelope<ServiceRequest>>(ep.serviceRequestReopen(id), { reason })),

  notifications: (page: number) => list<OwnerNotification>(ep.notifications, { page, pageSize: 25 }),
  markRead: (id: number) => data(ownerApi.post<Envelope<{ id: number; is_read: number }>>(ep.notificationRead(id))),

  mandates: () => list<Mandate>(ep.rentalMandates, { pageSize: MAX_PAGE_SIZE }).then((p) => p.items.map(realCapabilities)),
  statements: (mandateId: number) => list<Statement>(ep.mandateStatements(mandateId), { pageSize: MAX_PAGE_SIZE }).then((p) => p.items),
};
