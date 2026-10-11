// API dates are "YYYY-MM-DD"; timestamps are "YYYY-MM-DD HH:MM:SS" with no time zone (server
// time). They are shown as recorded: parsed as wall-clock parts and formatted in UTC so the
// browser's own zone never shifts them.

const PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/;

export function parseApiDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = PATTERN.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d, h = "0", mi = "0", s = "0"] = m;
  return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s));
}

const dateLocale = (locale: string) => (locale === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB");

export function formatDate(value: string | null | undefined, locale: string): string {
  const date = parseApiDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat(dateLocale(locale), { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

export function formatDateTime(value: string | null | undefined, locale: string): string {
  const date = parseApiDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat(dateLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

/** Today as "YYYY-MM-DD" (for date inputs and "not in the future" checks). */
export const todayIso = () => new Date().toISOString().slice(0, 10);
