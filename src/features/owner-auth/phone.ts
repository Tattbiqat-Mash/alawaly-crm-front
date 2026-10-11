/**
 * Normalises a Saudi mobile number to E.164 (+9665XXXXXXXX), the format the API examples use.
 * Accepts 05XXXXXXXX, 5XXXXXXXX, 9665XXXXXXXX, +9665XXXXXXXX, 009665XXXXXXXX, with spaces or
 * dashes, and Arabic-Indic digits. Returns null when it is not a valid mobile number.
 */
export function normalizeSaudiMobile(input: string): string | null {
  const ascii = input
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\s\-()]/g, "");
  const digits = ascii.replace(/^\+/, "").replace(/^00/, "");
  const local = digits.startsWith("966") ? digits.slice(3) : digits.startsWith("0") ? digits.slice(1) : digits;
  return /^5\d{8}$/.test(local) ? `+966${local}` : null;
}
