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

/**
 * Server timestamps carry no zone. For countdowns we need the real instant, so we assume the
 * server runs on Saudi time (UTC+3) — confirm per environment (see DECISIONS.md).
 */
export const SERVER_UTC_OFFSET_MINUTES = 180;

export function serverTimeToEpoch(value: string | null | undefined): number | null {
  const wallClock = parseApiDate(value);
  return wallClock ? wallClock.getTime() - SERVER_UTC_OFFSET_MINUTES * 60_000 : null;
}

/** "in 5 hours" / "2 days ago" relative to now; null when the value is missing. */
export function formatRelative(value: string | null | undefined, locale: string, now = Date.now()): string | null {
  const at = serverTimeToEpoch(value);
  if (at === null) return null;
  const diff = at - now;
  const rtf = new Intl.RelativeTimeFormat(locale === "ar" ? "ar-u-nu-latn" : "en", { numeric: "auto" });
  const minutes = Math.round(diff / 60_000);
  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
  const hours = Math.round(diff / 3_600_000);
  if (Math.abs(hours) < 48) return rtf.format(hours, "hour");
  return rtf.format(Math.round(diff / 86_400_000), "day");
}

/** Local datetime-input value ("2027-12-20T10:00") → API timestamp ("2027-12-20 10:00:00"). */
export const inputToApiTimestamp = (value: string) => (value ? `${value.replace("T", " ")}:00` : "");
