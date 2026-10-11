"use client";

import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/shared/status-badge";
import { isUnitStatus, unitStatusTone } from "@/config/statuses";

export function UnitStatusBadge({ status }: { status: string | null }) {
  const t = useTranslations("statuses.unit");
  if (!isUnitStatus(status)) return <StatusBadge>{t("unknown")}</StatusBadge>;
  return <StatusBadge tone={unitStatusTone[status]}>{t(status)}</StatusBadge>;
}
