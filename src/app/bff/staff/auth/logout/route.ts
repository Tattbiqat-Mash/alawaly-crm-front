import { NextResponse, type NextRequest } from "next/server";
import { staffEndpoints } from "@/config/endpoints";
import { STAFF_COOKIE } from "@/lib/bff/cookies";
import { callApi, clearSession, errorResponse, isSameOrigin } from "@/lib/bff/upstream";

// Revokes the token upstream when possible; the local session is cleared either way.
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return errorResponse(403, "FORBIDDEN", "Cross-site request refused.");

  const token = req.cookies.get(STAFF_COOKIE)?.value;
  if (token) {
    await callApi({ method: "POST", apiPath: staffEndpoints.logout, headers: req.headers, token }).catch(() => null);
  }
  return clearSession(NextResponse.json({ data: { logged_out: true } }), "staff");
}
