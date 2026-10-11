import { staffEndpoints } from "@/config/endpoints";
import { staffApi } from "@/lib/api/client";
import { unwrapList, type Envelope, type ListEnvelope } from "@/lib/api/envelope";
import { downloadFile } from "@/lib/api/files";
import { idempotencyHeader } from "@/lib/api/idempotency";
import { toSearchParams, type ListParams } from "@/lib/api/params";
import type { PaymentTransaction } from "./types";

const ep = staffEndpoints;
const data = <T>(p: Promise<{ data: Envelope<T> }>) => p.then((r) => r.data.data);

export type ConfirmOfflineInput = {
  payment_id?: number;
  reservation_id?: number;
  /** Decimal string; must equal the amount due (AMOUNT_MISMATCH otherwise). */
  amount: string;
  method: "bank_transfer" | "cash" | "cheque";
  reference: string;
};

export type ReconcileRow = { provider_ref: string; amount: string; status: string };
export type ReconcileResult = {
  matched: string[];
  missing_local: string[];
  missing_remote: string[];
  amount_mismatch: string[];
  status_mismatch: string[];
};

export const financeApi = {
  transactions: (params: ListParams) =>
    staffApi
      .get<ListEnvelope<PaymentTransaction>>(ep.paymentTransactions, { params: toSearchParams(params) })
      .then((r) => unwrapList(r.data)),
  /** First approver: creates a pending_second_approval transaction. Nothing is paid yet. */
  confirmOffline: (body: ConfirmOfflineInput, key: string) =>
    data(staffApi.post<Envelope<PaymentTransaction>>(ep.confirmOffline, body, { headers: idempotencyHeader(key) })),
  /** Second approver, a different person (FOUR_EYES_REQUIRED). */
  approve: (id: number) => data(staffApi.post<Envelope<PaymentTransaction>>(ep.approveTransaction(id))),
  reject: (id: number, reason: string) => data(staffApi.post<Envelope<PaymentTransaction>>(ep.rejectTransaction(id), { reason })),
  /** Records a refund only (no gateway call); bounded by what was paid. */
  refund: (id: number, body: { amount: string; reason: string }, key: string) =>
    data(staffApi.post<Envelope<PaymentTransaction>>(ep.refundTransaction(id), body, { headers: idempotencyHeader(key) })),
  reconcile: (provider: string, rows: ReconcileRow[]) =>
    data(staffApi.post<Envelope<ReconcileResult>>(ep.reconcile, { provider, rows })),
  exportPayments: () => downloadFile(staffApi, ep.exports("payments"), "payments.csv"),
};
