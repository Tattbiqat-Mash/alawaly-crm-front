// Shapes recorded in the Frontend Guide (payment transactions, initiate, confirm-offline).

export type PaymentTransaction = {
  id: number;
  payment_id: number | null;
  reservation_id: number | null;
  sale_id: number | null;
  client_id: number | null;
  provider: string;
  provider_ref: string | null;
  type: "payment" | "refund" | string;
  amount: string;
  currency: string;
  status: string;
  method: string | null;
  reference: string | null;
  verified_by: number | null;
  second_approver_id: number | null;
  verified_at: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

/** POST /payments/initiate → the transaction plus how to pay (offline instructions or a gateway session). */
export type InitiatedPayment = {
  transaction: PaymentTransaction;
  session: { mode: "offline"; instructions: string } | { mode: "gateway"; reference: number; note?: string };
};

/** Exactly one of payment_id (an installment) or reservation_id. */
export type InitiateInput = { provider: "offline"; payment_id?: number; reservation_id?: number };
