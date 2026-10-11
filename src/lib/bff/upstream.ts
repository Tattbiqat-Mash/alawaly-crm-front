import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { mockResponse } from "./mock";
import { secureCookie, sessionCookie, OWNER_PROFILE_COOKIE, type SessionKind } from "./cookies";

const API_BASE_URL = (process.env.API_BASE_URL ?? "https://system.alawaly.tattbiqat.com").replace(/\/+$/, "");
const mocksEnabled = () => process.env.API_MOCKS === "1";

/** Only these request headers reach the API (the token is added from the httpOnly cookie). */
const REQUEST_HEADERS = ["accept-language", "content-type", "idempotency-key", "if-match", "x-mock-status"];
/** Only these response headers reach the browser. */
const RESPONSE_HEADERS = ["content-type", "content-disposition", "etag", "idempotent-replayed", "retry-after"];

export function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}

/** Refuse cross-site writes: the session lives in cookies, so mutations must come from our own pages. */
export function isSameOrigin(req: NextRequest) {
  if (req.method === "GET" || req.method === "HEAD") return true;
  const origin = req.headers.get("origin");
  if (!origin) return req.headers.get("sec-fetch-site") !== "cross-site";
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

type CallApiOptions = {
  method: string;
  /** Path relative to /api/v2, starting with "/". */
  apiPath: string;
  search?: string;
  headers: Headers;
  body?: BodyInit;
  token?: string;
};

export async function callApi({ method, apiPath, search = "", headers, body, token }: CallApiOptions) {
  if (mocksEnabled()) return mockResponse(method, apiPath, headers);

  const outgoing = new Headers({ Accept: "application/json" });
  for (const name of REQUEST_HEADERS) {
    const value = headers.get(name);
    if (value && name !== "x-mock-status") outgoing.set(name, value);
  }
  if (token) outgoing.set("Authorization", `Bearer ${token}`);

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE_URL}/api/v2${apiPath}${search}`, {
      method,
      headers: outgoing,
      body,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return errorResponse(502, "UPSTREAM_UNAVAILABLE", "The service could not be reached.");
  }

  const out = new Headers({ "Cache-Control": "no-store" });
  for (const name of RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) out.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers: out });
}

/** Clears a session's cookies on the given response. */
export function clearSession(res: NextResponse, kind: SessionKind) {
  res.cookies.set(sessionCookie(kind), "", { ...secureCookie, maxAge: 0 });
  if (kind === "owner") res.cookies.set(OWNER_PROFILE_COOKIE, "", { ...secureCookie, maxAge: 0 });
  return res;
}

/** Generic authenticated pass-through used by /bff/staff/[...path] and /bff/owner/[...path]. */
export async function proxyRoute(req: NextRequest, segments: string[], kind: SessionKind) {
  if (!isSameOrigin(req)) return errorResponse(403, "FORBIDDEN", "Cross-site request refused.");
  if (segments.some((s) => s === "" || s === "." || s === "..")) {
    return errorResponse(400, "NOT_FOUND", "Invalid path.");
  }
  // Staff tokens never reach /owner/* and owner calls always land under /owner.
  if (kind === "staff" && segments[0] === "owner") return errorResponse(404, "NOT_FOUND", "Not found.");

  const rest = segments.map(encodeURIComponent).join("/");
  const apiPath = kind === "owner" ? `/owner/${rest}` : `/${rest}`;

  const token = req.cookies.get(sessionCookie(kind))?.value;
  if (!token) return clearSession(errorResponse(401, "UNAUTHENTICATED", "Authentication is required."), kind);

  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer();
  const res = await callApi({ method: req.method, apiPath, search: req.nextUrl.search, headers: req.headers, body, token });

  const out = new NextResponse(res.body, { status: res.status, headers: res.headers });
  return res.status === 401 ? clearSession(out, kind) : out;
}
