import { NextResponse, type NextRequest } from "next/server";
import { ownerEndpoints } from "@/config/endpoints";
import { OWNER_COOKIE } from "@/lib/bff/cookies";
import { callApi, clearSession, errorResponse, isSameOrigin } from "@/lib/bff/upstream";

// Revokes the owner token upstream when possible; the local session is cleared either way.
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return errorResponse(403, "FORBIDDEN", "Cross-site request refused.");

  const token = req.cookies.get(OWNER_COOKIE)?.value;
  if (token) {
    await callApi({
      method: "POST",
      apiPath: `/owner${ownerEndpoints.logout}`,
      headers: req.headers,
      token,
    }).catch(() => null);
  }
  return clearSession(NextResponse.json({ data: { logged_out: true } }), "owner");
}
