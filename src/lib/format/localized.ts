// Bilingual records come as nameAr/nameEn or name_ar/name_en (and the same for titles).

type Bilingual = Record<string, unknown>;

export function localizedField(record: Bilingual | null | undefined, base: string, locale: string): string {
  if (!record) return "";
  const suffixes = locale === "ar" ? ["Ar", "_ar", "En", "_en"] : ["En", "_en", "Ar", "_ar"];
  for (const suffix of suffixes) {
    const value = record[`${base}${suffix}`];
    if (typeof value === "string" && value.trim()) return value;
  }
  const plain = record[base];
  return typeof plain === "string" ? plain : "";
}

export const localizedName = (record: Bilingual | null | undefined, locale: string) =>
  localizedField(record, "name", locale);

/** Stored flags come back as 0/1. */
export const isOn = (value: unknown) => value === 1 || value === true || value === "1";
