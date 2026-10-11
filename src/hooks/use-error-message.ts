"use client";

import { useTranslations } from "next-intl";
import { KNOWN_ERROR_CODES, toApiError, type KnownErrorCode } from "@/lib/api/errors";

const isKnown = (code: string): code is KnownErrorCode => KNOWN_ERROR_CODES.includes(code as KnownErrorCode);

/** Translated, user-safe text for an API error. Raw server messages are never shown. */
export function useErrorMessage() {
  const t = useTranslations("errors");
  return (error: unknown) => {
    const { code } = toApiError(error);
    return isKnown(code) ? t(`codes.${code}`) : t("generic");
  };
}
