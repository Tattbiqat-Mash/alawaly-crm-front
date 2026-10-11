// Cookie names shared by the BFF route handlers and proxy.ts (no server-only imports here).
export const STAFF_COOKIE = "alw_staff";
export const OWNER_COOKIE = "alw_owner";
/** Owner display data ({id, name}) returned at verify time: the API has no owner /me. */
export const OWNER_PROFILE_COOKIE = "alw_owner_profile";
/** Phone number between "send code" and "verify" (httpOnly, 10 minutes). */
export const OWNER_PHONE_COOKIE = "alw_owner_phone";
/** Masked phone shown on the verify screen (readable, no full number). */
export const OWNER_PHONE_HINT_COOKIE = "alw_owner_phone_hint";

export type SessionKind = "staff" | "owner";

export const sessionCookie = (kind: SessionKind) => (kind === "staff" ? STAFF_COOKIE : OWNER_COOKIE);

export const secureCookie = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
