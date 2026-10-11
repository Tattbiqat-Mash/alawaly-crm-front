"use client";

import { useTranslations } from "next-intl";
import { PRICE_FIELDS, type PriceField } from "./types";

export const isPriceField = (f: string): f is PriceField => PRICE_FIELDS.includes(f as PriceField);

/** Translated label for a price field name returned by the API (falls back to the raw name). */
export function usePriceFieldLabel() {
  const t = useTranslations("units.priceDialog.fields");
  return (field: string) => (isPriceField(field) ? t(field) : field);
}
