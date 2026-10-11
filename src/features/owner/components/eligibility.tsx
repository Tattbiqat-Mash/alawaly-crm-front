"use client";

import { useTranslations } from "next-intl";

const REASONS = ["NO_RECORDED_OWNER", "NOT_CURRENT_OWNER", "NO_ALAWALY_SALE_RECORD", "NO_ACTIVE_WARRANTY", "WARRANTY_TRANSFER_UNDECIDED", "WARRANTY_NOT_TRANSFERABLE"] as const;
const CATEGORIES = ["structural", "finishing", "plumbing", "electrical", "hvac", "appliances", "other"] as const;
type Reason = (typeof REASONS)[number];
type Category = (typeof CATEGORIES)[number];

export const WARRANTY_CATEGORIES = CATEGORIES;

/** Eligibility reason codes (also NOT_ELIGIBLE.details.reasons) in plain words; unknown codes pass through. */
export function useEligibilityText() {
  const t = useTranslations("units.eligibility");
  return {
    reason: (code: string) => ((REASONS as readonly string[]).includes(code) ? t(`reasons.${code as Reason}`) : code),
    category: (code: string) => ((CATEGORIES as readonly string[]).includes(code) ? t(`categories.${code as Category}`) : code),
  };
}

/** Reasons from a NOT_ELIGIBLE error, if that is what it is. */
export function notEligibleReasons(error: unknown): string[] | null {
  const e = error as { code?: string; details?: { reasons?: unknown } } | null;
  if (e?.code !== "NOT_ELIGIBLE") return null;
  return Array.isArray(e.details?.reasons) ? e.details.reasons.filter((r): r is string => typeof r === "string") : [];
}
