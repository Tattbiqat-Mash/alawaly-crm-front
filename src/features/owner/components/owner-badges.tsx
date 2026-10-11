"use client";

import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/shared/status-badge";
import { installmentTone } from "@/config/statuses";

const INSTALLMENT_LABELS = ["pending", "paid", "canceled", "overdue", "waived", "refunded"] as const;
type InstallmentLabel = (typeof INSTALLMENT_LABELS)[number];

/** An installment's `state` (overdue, waived, refunded) wins over its `status` when present. */
export function InstallmentBadge({ status, state }: { status: string; state: string | null }) {
  const t = useTranslations("statuses.installment");
  const key = state && (INSTALLMENT_LABELS as readonly string[]).includes(state) ? state : status;
  return <StatusBadge tone={installmentTone(status, state)}>{(INSTALLMENT_LABELS as readonly string[]).includes(key) ? t(key as InstallmentLabel) : key}</StatusBadge>;
}
