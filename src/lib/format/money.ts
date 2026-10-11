// Money arrives as decimal strings with varying precision ("5000.0000", "5000", "575000.00") and,
// in a few report fields, as plain numbers. Math is done on integer minor units (halalas) with
// BigInt — never floating point. Display uses the exact decimal string.

export type MoneyInput = string | number | null | undefined;

const MINOR_DIGITS = 2;
const SCALE = BigInt(10 ** MINOR_DIGITS);

/** Converts an API amount to integer minor units, rounding half away from zero at 2 decimals. */
export function toMinor(value: MoneyInput): bigint | null {
  if (value === null || value === undefined || value === "") return null;
  const text = typeof value === "number" ? numberToDecimalString(value) : value.trim();
  const match = /^(-)?(\d+)(?:\.(\d+))?$/.exec(text);
  if (!match) return null;
  const [, sign, whole, fraction = ""] = match;
  const kept = fraction.slice(0, MINOR_DIGITS).padEnd(MINOR_DIGITS, "0");
  let minor = BigInt(whole) * SCALE + BigInt(kept);
  if ((fraction[MINOR_DIGITS] ?? "0") >= "5") minor += BigInt(1);
  return sign ? -minor : minor;
}

function numberToDecimalString(n: number) {
  if (!Number.isFinite(n)) return "";
  // Integers (the common case for report totals) are exact; otherwise keep enough digits.
  return Number.isInteger(n) ? n.toFixed(0) : n.toFixed(6);
}

/** Minor units back to a canonical decimal string ("575000.00"). */
export function fromMinor(minor: bigint): string {
  const negative = minor < BigInt(0);
  const abs = negative ? -minor : minor;
  const whole = abs / SCALE;
  const fraction = (abs % SCALE).toString().padStart(MINOR_DIGITS, "0");
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

export const addMoney = (...values: MoneyInput[]) =>
  fromMinor(values.reduce<bigint>((sum, v) => sum + (toMinor(v) ?? BigInt(0)), BigInt(0)));

export const subtractMoney = (a: MoneyInput, b: MoneyInput) =>
  fromMinor((toMinor(a) ?? BigInt(0)) - (toMinor(b) ?? BigInt(0)));

export function compareMoney(a: MoneyInput, b: MoneyInput): -1 | 0 | 1 {
  const x = toMinor(a) ?? BigInt(0);
  const y = toMinor(b) ?? BigInt(0);
  return x === y ? 0 : x < y ? -1 : 1;
}

/** Amounts always use Western digits (Frontend Guide), in both languages. */
const numberLocale = (locale: string) => (locale === "ar" ? "ar-SA-u-nu-latn" : "en-SA");

/** Formats an API amount, e.g. "575000.00" → "575,000.00 SAR" / "‏575,000.00 ر.س.‏". */
export function formatMoney(value: MoneyInput, locale: string, currency = "SAR"): string {
  const minor = toMinor(value);
  if (minor === null) return "—";
  return new Intl.NumberFormat(numberLocale(locale), {
    style: "currency",
    currency,
    minimumFractionDigits: MINOR_DIGITS,
    maximumFractionDigits: MINOR_DIGITS,
    // Intl formats decimal strings exactly (no float conversion).
  }).format(fromMinor(minor) as `${number}`);
}

/** Decimal quantities such as areas ("142.500" m²), trimmed of trailing zeros. */
export function formatDecimal(value: string | number | null | undefined, locale: string, maxDigits = 3): string {
  if (value === null || value === undefined || value === "") return "—";
  const text = String(value).trim();
  if (!/^-?\d+(\.\d+)?$/.test(text)) return "—";
  return new Intl.NumberFormat(numberLocale(locale), { maximumFractionDigits: maxDigits }).format(
    text as `${number}`,
  );
}

export const formatCount = (value: number | null | undefined, locale: string) =>
  value === null || value === undefined ? "—" : new Intl.NumberFormat(numberLocale(locale)).format(value);
