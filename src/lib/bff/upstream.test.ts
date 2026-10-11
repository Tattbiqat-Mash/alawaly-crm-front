// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { callApi, isSameOrigin, proxyRoute } from "./upstream";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function captureFetch(response: Response) {
  const calls: { url: string; init: RequestInit }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return response;
    }),
  );
  return calls;
}

describe("callApi", () => {
  it("forwards only allowed headers, adds the token, and returns only allowed headers", async () => {
    const calls = captureFetch(
      new Response("{}", { status: 200, headers: { ETag: '"3"', "Set-Cookie": "x=1", "X-Powered-By": "PHP" } }),
    );
    const incoming = new Headers({
      "Accept-Language": "ar",
      "Idempotency-Key": "k-1",
      "If-Match": '"2"',
      Cookie: "alw_staff=secret",
      Authorization: "Bearer injected",
    });

    const res = await callApi({ method: "PATCH", apiPath: "/units/1", headers: incoming, token: "tok" });

    const sent = new Headers(calls[0].init.headers);
    expect(calls[0].url).toMatch(/\/api\/v2\/units\/1$/);
    expect(sent.get("authorization")).toBe("Bearer tok");
    expect(sent.get("idempotency-key")).toBe("k-1");
    expect(sent.get("if-match")).toBe('"2"');
    expect(sent.get("accept-language")).toBe("ar");
    expect(sent.get("cookie")).toBeNull();

    expect(res.headers.get("etag")).toBe('"3"');
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(res.headers.get("x-powered-by")).toBeNull();
  });

  it("turns an unreachable API into UPSTREAM_UNAVAILABLE", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    const res = await callApi({ method: "GET", apiPath: "/me", headers: new Headers() });
    expect(res.status).toBe(502);
    expect((await res.json()).error.code).toBe("UPSTREAM_UNAVAILABLE");
  });
});

describe("proxyRoute", () => {
  it("refuses cross-site writes", async () => {
    const req = new NextRequest("http://app.test/bff/staff/units/1", {
      method: "PATCH",
      headers: { origin: "https://evil.test", host: "app.test" },
    });
    const res = await proxyRoute(req, ["units", "1"], "staff");
    expect(res.status).toBe(403);
  });

  it("keeps staff sessions away from /owner/*", async () => {
    const req = new NextRequest("http://app.test/bff/staff/owner/units", { headers: { cookie: "alw_staff=tok" } });
    const res = await proxyRoute(req, ["owner", "units"], "staff");
    expect(res.status).toBe(404);
  });

  it("prefixes owner calls with /owner and clears the cookie on 401", async () => {
    const calls = captureFetch(new Response('{"error":{"code":"UNAUTHENTICATED"}}', { status: 401 }));
    const req = new NextRequest("http://app.test/bff/owner/units?page=2", { headers: { cookie: "alw_owner=tok" } });
    const res = await proxyRoute(req, ["units"], "owner");
    expect(calls[0].url).toMatch(/\/api\/v2\/owner\/units\?page=2$/);
    expect(res.status).toBe(401);
    expect(res.headers.get("set-cookie")).toMatch(/alw_owner=;/);
  });
});

describe("isSameOrigin", () => {
  it("allows reads and same-host writes", () => {
    expect(isSameOrigin(new NextRequest("http://app.test/x"))).toBe(true);
    expect(
      isSameOrigin(new NextRequest("http://app.test/x", { method: "POST", headers: { origin: "http://app.test", host: "app.test" } })),
    ).toBe(true);
  });
});
