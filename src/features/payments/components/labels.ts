"use client";

import { useTranslations } from "next-intl";
import { isPaymentMethod } from "@/config/statuses";
import type { PaymentTransaction } from "../types";

const PROVIDERS = ["offline", "generic_hmac"] as const;

/** Translated labels shared by the finance screens. */
export function usePaymentLabels() {
  const t = useTranslations();
  return {
    provider: (p: string) => (PROVIDERS.includes(p as (typeof PROVIDERS)[number]) ? t(`payments.providers.${p as (typeof PROVIDERS)[number]}`) : p),
    method: (m: string | null) => (isPaymentMethod(m) ? t(`statuses.paymentMethod.${m}`) : (m ?? "—")),
    type: (tx: PaymentTransaction) => (tx.type === "refund" ? t("statuses.paymentType.refund") : t("statuses.paymentType.payment")),
    /** What the money is for: an installment, a reservation fee or a sale. */
    target: (tx: PaymentTransaction) =>
      tx.payment_id
        ? t("payments.forInstallment", { id: tx.payment_id })
        : tx.reservation_id
          ? t("payments.forReservation", { id: tx.reservation_id })
          : tx.sale_id
            ? t("payments.forSale", { id: tx.sale_id })
            : "—",
    staff: (id: number | null) => (id ? t("common.staffRef", { id }) : "—"),
  };
}
