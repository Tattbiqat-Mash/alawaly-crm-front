"use client";

import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { StatusBadge, type Tone } from "@/components/shared/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toApiError } from "@/lib/api/errors";
import { KNOWN_CAPABILITIES, LEASE_STATUSES, MANDATE_MODES, MANDATE_STATUSES, RENT_STATUSES, type Mandate } from "../api";
import { useAllMandates } from "../hooks";

type Known<T extends readonly string[]> = T[number];
const isIn = <T extends readonly string[]>(list: T, v: string): v is Known<T> => list.includes(v);

export function useRentalLabels() {
  const t = useTranslations("statuses");
  return {
    mode: (m: string) => (isIn(MANDATE_MODES, m) ? t(`mandateMode.${m}`) : m),
    capability: (c: string) => (isIn(KNOWN_CAPABILITIES, c) ? t(`capability.${c}`) : c),
    frequency: (f: string) => (isIn(["monthly", "quarterly", "semi_annual", "annual"] as const, f) ? t(`frequency.${f}`) : f),
  };
}

const mandateTone: Record<Known<typeof MANDATE_STATUSES>, Tone> = { draft: "neutral", active: "success", ended: "info", revoked: "danger" };
const leaseTone: Record<Known<typeof LEASE_STATUSES>, Tone> = { draft: "neutral", active: "success", ended: "info", terminated: "danger" };
const rentTone: Record<Known<typeof RENT_STATUSES>, Tone> = { pending: "warning", paid: "success", overdue: "danger", waived: "neutral" };

export function MandateStatusBadge({ status }: { status: string }) {
  const t = useTranslations("statuses.mandate");
  return isIn(MANDATE_STATUSES, status) ? <StatusBadge tone={mandateTone[status]}>{t(status)}</StatusBadge> : <StatusBadge>{status}</StatusBadge>;
}
export function LeaseStatusBadge({ status }: { status: string }) {
  const t = useTranslations("statuses.lease");
  return isIn(LEASE_STATUSES, status) ? <StatusBadge tone={leaseTone[status]}>{t(status)}</StatusBadge> : <StatusBadge>{status}</StatusBadge>;
}
export function RentStatusBadge({ status }: { status: string }) {
  const t = useTranslations("statuses.rent");
  return isIn(RENT_STATUSES, status) ? <StatusBadge tone={rentTone[status]}>{t(status)}</StatusBadge> : <StatusBadge>{status}</StatusBadge>;
}

export function CapabilityChips({ capabilities }: { capabilities: string[] }) {
  const labels = useRentalLabels();
  return (
    <span className="flex flex-wrap gap-1">
      {capabilities.map((c) => (
        <span key={c} className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
          {labels.capability(c)}
        </span>
      ))}
    </span>
  );
}

/** Mandate select used by tenants, leases and statements (?mandate= in the URL). */
export function MandatePicker({ value, onChange, require }: { value: number | null; onChange: (id: number | null) => void; require?: string }) {
  const t = useTranslations("rentals");
  const labels = useRentalLabels();
  const mandates = useAllMandates();
  const options = (mandates.data ?? []).filter((m) => !require || m.capabilities.includes(require) || m.mode === "full_management");
  return (
    <Select value={value ? String(value) : ""} onValueChange={(v) => onChange(v ? Number(v) : null)}>
      <SelectTrigger aria-label={t("mandatePicker")} className="h-9 min-w-64 bg-background shadow-2xs">
        <span className="text-xs text-muted-foreground">{t("mandatePicker")}:</span>
        <SelectValue placeholder={t("pickMandate")} />
      </SelectTrigger>
      <SelectContent>
        {options.map((m) => (
          <SelectItem key={m.id} value={String(m.id)}>
            {t("mandateLabel", { id: m.id, unit: m.unit_id, mode: labels.mode(m.mode) })}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Read-only explanation: either the mandate lacks a known capability, or the API refused with
 * 403 MANDATE_SCOPE (details.reason in plain words).
 */
export function MandateScopeBanner({ mandate, capability, error }: { mandate?: Mandate; capability?: string; error?: unknown }) {
  const t = useTranslations("rentals");
  const labels = useRentalLabels();
  const apiError = error ? toApiError(error) : null;
  let text: string | null = null;
  if (apiError?.code === "MANDATE_SCOPE") {
    const reason = apiError.details?.reason;
    text =
      reason === "CAPABILITY_NOT_GRANTED" || reason === "MANDATE_NOT_ACTIVE" || reason === "MANDATE_OUTSIDE_VALIDITY"
        ? t(`scopeBanner.${reason}`)
        : t("scopeBanner.CAPABILITY_NOT_GRANTED");
  } else if (mandate && mandate.status !== "active") {
    text = t("scopeBanner.MANDATE_NOT_ACTIVE");
  } else if (mandate && capability && !mandate.capabilities.includes(capability) && mandate.mode !== "full_management") {
    text = t("notGranted", { capability: labels.capability(capability) });
  }
  if (!text) return null;
  return (
    <p role="status" className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
      <Lock aria-hidden className="size-4 shrink-0" />
      {text}
    </p>
  );
}

/** Whether actions needing `capability` are allowed under this mandate (server still decides). */
export const mandateAllows = (mandate: Mandate | undefined, capability: string) =>
  Boolean(mandate) && mandate!.status === "active" && (mandate!.capabilities.includes(capability) || mandate!.mode === "full_management");
