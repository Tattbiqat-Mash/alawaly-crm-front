"use client";

import { useTranslations } from "next-intl";
import { StatusBadge, type Tone } from "@/components/shared/status-badge";
import { isHandoverStatus, type HandoverStatus } from "@/config/statuses";
import { SEVERITIES, type Severity } from "../api";

const handoverTone: Record<HandoverStatus, Tone> = {
  scheduled: "info",
  inspected: "warning",
  accepted: "success",
  accepted_with_snags: "warning",
  closed: "neutral",
};

export function HandoverStatusBadge({ status }: { status: string }) {
  const t = useTranslations("statuses.handover");
  return isHandoverStatus(status) ? <StatusBadge tone={handoverTone[status]}>{t(status)}</StatusBadge> : <StatusBadge>{status}</StatusBadge>;
}

const severityTone: Record<Severity, Tone> = { minor: "neutral", major: "warning", critical: "danger" };

export function SeverityBadge({ severity }: { severity: string }) {
  const t = useTranslations("statuses.severity");
  const known = SEVERITIES.includes(severity as Severity);
  return known ? <StatusBadge tone={severityTone[severity as Severity]}>{t(severity as Severity)}</StatusBadge> : <StatusBadge>{severity}</StatusBadge>;
}

const SNAG_STATUSES = ["open", "fixed", "waived"] as const;
const snagTone: Record<(typeof SNAG_STATUSES)[number], Tone> = { open: "warning", fixed: "success", waived: "neutral" };

export function SnagStatusBadge({ status }: { status: string }) {
  const t = useTranslations("statuses.snag");
  const known = SNAG_STATUSES.includes(status as "open");
  return known ? <StatusBadge tone={snagTone[status as "open"]}>{t(status as "open")}</StatusBadge> : <StatusBadge>{status}</StatusBadge>;
}
