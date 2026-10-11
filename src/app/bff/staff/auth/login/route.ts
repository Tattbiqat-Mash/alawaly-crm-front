import { NextResponse, type NextRequest } from "next/server";
import { staffEndpoints } from "@/config/endpoints";
import { STAFF_COOKIE, secureCookie } from "@/lib/bff/cookies";
import { callApi, errorResponse, isSameOrigin } from "@/lib/bff/upstream";

type LoginResponse = {
  data: { token: string; user: { id: number; name: string; email: string; role_id: number }; permissions: string[] };
};

// Signs the staff user in and keeps the token in an httpOnly cookie; the browser never sees it.
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return errorResponse(403, "FORBIDDEN", "Cross-site request refused.");

  const res = await callApi({
    method: "POST",
    apiPath: staffEndpoints.login,
    headers: req.headers,
    body: await req.text(),
  });
  if (!res.ok) return res;

  const { data } = (await res.json()) as LoginResponse;
  const out = NextResponse.json({ data: { user: data.user, permissions: data.permissions } });
  out.cookies.set(STAFF_COOKIE, data.token, secureCookie);
  return out;
}
