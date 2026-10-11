import { staffEndpoints } from "@/config/endpoints";
import type { InitiatedPayment, InitiateInput, PaymentTransaction } from "@/features/payments/types";
import { staffApi } from "@/lib/api/client";
import { unwrapList, type Envelope, type ListEnvelope } from "@/lib/api/envelope";
import { uploadMultipart } from "@/lib/api/files";
import { idempotencyHeader } from "@/lib/api/idempotency";
import { MAX_PAGE_SIZE, toSearchParams, type ListParams } from "@/lib/api/params";
import type {
  CancelSaleResult,
  Installment,
  InstallmentSchedule,
  Reservation,
  Sale,
  SaleDocument,
  SaleHandover,
  Warranty,
  WarrantyPolicy,
} from "./types";

const ep = staffEndpoints;
const list = <T>(path: string, params: ListParams) =>
  staffApi.get<ListEnvelope<T>>(path, { params: toSearchParams(params) }).then((r) => unwrapList(r.data));
const data = <T>(p: Promise<{ data: Envelope<T> }>) => p.then((r) => r.data.data);

export const reservationsApi = {
  list: (params: ListParams) => list<Reservation>(ep.reservations, params),
  get: (id: number) => data(staffApi.get<Envelope<Reservation>>(ep.reservation(id))),
  create: (body: { unit_id: number; client_id: number; notes?: string }, key: string) =>
    data(staffApi.post<Envelope<Reservation>>(ep.reservations, body, { headers: idempotencyHeader(key) })),
  /** 409 POLICY_NOT_CONFIGURED (D-06) until a hold time is configured. */
  extend: (id: number, hours: number) => data(staffApi.post<Envelope<Reservation>>(ep.extendReservation(id), { hours })),
  cancel: (id: number, reason: string) => data(staffApi.post<Envelope<Reservation>>(ep.cancelReservation(id), { reason })),
};

export const salesApi = {
  list: (params: ListParams) => list<Sale>(ep.sales, params),
  get: (id: number) => data(staffApi.get<Envelope<Sale>>(ep.sale(id))),
  create: (body: { unit_id: number; client_id: number; reservation_id?: number; price_agreed: string }, key: string) =>
    data(staffApi.post<Envelope<Sale>>(ep.sales, body, { headers: idempotencyHeader(key) })),
  transition: (id: number, to: string) => data(staffApi.post<Envelope<Sale>>(ep.saleTransition(id), { to })),
  cancel: (id: number, reason: string) => data(staffApi.post<Envelope<CancelSaleResult>>(ep.saleCancel(id), { reason })),

  installments: (id: number) =>
    staffApi
      .get<{ data: Installment[]; meta?: { total?: string | number; paid?: string | number } }>(ep.saleInstallments(id))
      .then((r): InstallmentSchedule => ({ items: r.data.data, total: r.data.meta?.total ?? null, paid: r.data.meta?.paid ?? null })),
  /** 409 POLICY_NOT_CONFIGURED (D-07) until the price basis is configured. */
  generateInstallments: (id: number) => data(staffApi.post<Envelope<Installment[]>>(ep.generateInstallments(id))),
  changeInstallmentDate: (id: number, date: string) => data(staffApi.patch<Envelope<Installment>>(ep.installment(id), { date })),

  documents: (id: number) => data(staffApi.get<Envelope<SaleDocument[]>>(ep.saleDocuments(id))),
  documentLink: (id: number, docId: number) => staffApi.get<Envelope<{ url: string; expires_in: number }>>(ep.saleDocumentLink(id, docId)).then((r) => r.data),
  uploadDocument: (id: number, type: string, file: File, onProgress: (p: number) => void) =>
    uploadMultipart<SaleDocument>(staffApi, ep.saleDocuments(id), { type, file }, { onProgress }),

  handoversForSale: (id: number) => list<SaleHandover>(ep.handovers, { pageSize: 10, filter: { sale_id: id }, sort: "-id" }).then((p) => p.items),
  warrantiesForSale: (id: number) => list<Warranty>(ep.warranties, { pageSize: MAX_PAGE_SIZE, filter: { sale_id: id } }).then((p) => p.items),
  scheduleHandover: (id: number, body: { scheduled_at: string; notes?: string }) =>
    data(staffApi.post<Envelope<SaleHandover>>(ep.saleHandover(id), body)),
  warrantyPolicies: () => list<WarrantyPolicy>(ep.warrantyPolicies, { pageSize: MAX_PAGE_SIZE }).then((p) => p.items),
  applyWarranties: (id: number, policyIds: number[]) =>
    data(staffApi.post<Envelope<unknown[]>>(ep.saleWarranties(id), { policy_ids: policyIds })),
  transactions: (saleId: number) =>
    list<PaymentTransaction>(ep.paymentTransactions, { pageSize: MAX_PAGE_SIZE, filter: { sale_id: saleId }, sort: "-id" }),
};

export const paymentsApi = {
  /** Offline only: the brief excludes card payment until a gateway is chosen. */
  initiate: (body: InitiateInput, key: string) =>
    data(staffApi.post<Envelope<InitiatedPayment>>(ep.paymentsInitiate, body, { headers: idempotencyHeader(key) })),
};
