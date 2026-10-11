"use client";

import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/shared/status-badge";
import { isOn } from "@/lib/format/localized";

export function ActiveBadge({ value }: { value: unknown }) {
  const t = useTranslations("common");
  return isOn(value) ? <StatusBadge tone="success">{t("active")}</StatusBadge> : <StatusBadge>{t("inactive")}</StatusBadge>;
}
