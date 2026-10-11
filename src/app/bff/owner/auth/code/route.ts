import { NextResponse, type NextRequest } from "next/server";
import { ownerEndpoints } from "@/config/endpoints";
import { OWNER_PHONE_COOKIE, OWNER_PHONE_HINT_COOKIE, secureCookie } from "@/lib/bff/cookies";
import { callApi, errorResponse, isSameOrigin } from "@/lib/bff/upstream";

const TEN_MINUTES = 600;

// Requests a sign-in code. The phone is kept server-side (httpOnly) for the verify step,
// so it never travels in the URL; only a masked hint is readable by the page.
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return errorResponse(403, "FORBIDDEN", "Cross-site request refused.");

  const body = (await req.json().catch(() => null)) as { phone?: unknown } | null;
  // "Resend" on the verify screen sends no phone: reuse the one kept from the first request.
  const phone = typeof body?.phone === "string" && body.phone ? body.phone : (req.cookies.get(OWNER_PHONE_COOKIE)?.value ?? "");

  const res = await callApi({
    method: "POST",
    apiPath: `/owner${ownerEndpoints.requestCode}`,
    headers: req.headers,
    body: JSON.stringify({ phone }),
  });
  if (!res.ok) return res;

  const out = NextResponse.json(await res.json());
  out.cookies.set(OWNER_PHONE_COOKIE, phone, { ...secureCookie, maxAge: TEN_MINUTES });
  out.cookies.set(OWNER_PHONE_HINT_COOKIE, `•••• ${phone.slice(-4)}`, {
    ...secureCookie,
    httpOnly: false,
    maxAge: TEN_MINUTES,
  });
  return out;
}
