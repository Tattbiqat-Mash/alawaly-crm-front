import { NextResponse, type NextRequest } from "next/server";
import { ownerEndpoints } from "@/config/endpoints";
import {
  OWNER_COOKIE,
  OWNER_PHONE_COOKIE,
  OWNER_PHONE_HINT_COOKIE,
  OWNER_PROFILE_COOKIE,
  secureCookie,
} from "@/lib/bff/cookies";
import { callApi, errorResponse, isSameOrigin } from "@/lib/bff/upstream";

type VerifyResponse = { data: { token: string; client: { id: number; name: string } } };

// Verifies the one-time code and opens the owner session (separate from any staff session).
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return errorResponse(403, "FORBIDDEN", "Cross-site request refused.");

  const phone = req.cookies.get(OWNER_PHONE_COOKIE)?.value;
  // BFF-only code: the code step expired or was skipped; the page sends the owner back to sign-in.
  if (!phone) return errorResponse(400, "CODE_SESSION_EXPIRED", "Request a new code.");

  const body = (await req.json().catch(() => null)) as { code?: unknown } | null;
  const code = typeof body?.code === "string" ? body.code : "";

  const res = await callApi({
    method: "POST",
    apiPath: `/owner${ownerEndpoints.verify}`,
    headers: req.headers,
    body: JSON.stringify({ phone, code }),
  });
  if (!res.ok) return res;

  const { data } = (await res.json()) as VerifyResponse;
  const out = NextResponse.json({ data: { client: data.client } });
  out.cookies.set(OWNER_COOKIE, data.token, secureCookie);
  // Display-only (greeting); never used for authorization.
  out.cookies.set(OWNER_PROFILE_COOKIE, JSON.stringify(data.client), secureCookie);
  out.cookies.set(OWNER_PHONE_COOKIE, "", { ...secureCookie, maxAge: 0 });
  out.cookies.set(OWNER_PHONE_HINT_COOKIE, "", { ...secureCookie, httpOnly: false, maxAge: 0 });
  return out;
}
