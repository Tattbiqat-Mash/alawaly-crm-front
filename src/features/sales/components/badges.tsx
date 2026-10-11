"use client";

import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  isPaymentStatus,
  isReservationState,
  isSaleStatus,
  paymentStatusTone,
  reservationStateTone,
  saleStatusTone,
} from "@/config/statuses";

export function ReservationStateBadge({ state }: { state: string }) {
  const t = useTranslations("statuses.reservation");
  return isReservationState(state) ? <StatusBadge tone={reservationStateTone[state]}>{t(state)}</StatusBadge> : <StatusBadge>{state}</StatusBadge>;
}

export function SaleStatusBadge({ status }: { status: string }) {
  const t = useTranslations("statuses.sale");
  return isSaleStatus(status) ? <StatusBadge tone={saleStatusTone[status]}>{t(status)}</StatusBadge> : <StatusBadge>{status}</StatusBadge>;
}

/** Only `succeeded` reads as paid; a recorded or uploaded payment is still waiting. */
export function PaymentStatusBadge({ status }: { status: string }) {
  const t = useTranslations("statuses.payment");
  return isPaymentStatus(status) ? <StatusBadge tone={paymentStatusTone[status]}>{t(status)}</StatusBadge> : <StatusBadge>{status}</StatusBadge>;
}
