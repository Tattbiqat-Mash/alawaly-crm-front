import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import { hasPermission } from "@/config/permissions";
import { unwrapList } from "./envelope";
import { ApiError, fieldErrors, toApiError } from "./errors";
import { toSearchParams } from "./params";
import { shouldRetryQuery } from "./query-client";

const axiosError = (status: number, data: unknown, headers: Record<string, string> = {}) =>
  new AxiosError("Request failed", "ERR", undefined, undefined, {
    status,
    statusText: "",
    data,
    headers,
    config: { headers: new AxiosHeaders() },
  });

describe("toApiError", () => {
  it("keeps the API error code, details and correlation id", () => {
    const e = toApiError(
      axiosError(409, {
        error: {
          code: "POLICY_NOT_CONFIGURED",
          message: "x",
          details: { policy: "installments.price_basis", decision: "D-07" },
        },
      }),
    );
    expect(e.code).toBe("POLICY_NOT_CONFIGURED");
    expect(e.status).toBe(409);
    expect(e.details).toEqual({ policy: "installments.price_basis", decision: "D-07" });

    const server = toApiError(axiosError(500, { error: { code: "SERVER_ERROR", message: "x", correlation_id: "abc" } }));
    expect(server.correlationId).toBe("abc");
  });

  it("treats a 409 VERSION_CONFLICT and a 412 the same way", () => {
    expect(toApiError(axiosError(409, { error: { code: "VERSION_CONFLICT", message: "" } })).isConflict).toBe(true);
    expect(toApiError(axiosError(412, "")).isConflict).toBe(true);
  });

  it("falls back to a code from the status when the body is not an API error", () => {
    expect(toApiError(axiosError(403, "<html>")).code).toBe("FORBIDDEN");
    expect(toApiError(axiosError(429, null, { "retry-after": "30" })).retryAfter).toBe(30);
  });

  it("maps a missing response to a network error", () => {
    const e = toApiError(new AxiosError("Network Error", "ERR_NETWORK"));
    expect(e.code).toBe("NETWORK_ERROR");
    expect(e.isNetwork).toBe(true);
  });

  it("extracts VALIDATION_FAILED field messages", () => {
    const e = new ApiError({
      status: 422,
      code: "VALIDATION_FAILED",
      message: "",
      details: { nameEn: ["required"], rooms: ["must be a number"] },
    });
    expect(fieldErrors(e)).toEqual({ nameEn: ["required"], rooms: ["must be a number"] });
  });
});

describe("retry policy", () => {
  it("retries reads on network, 5xx and 429 only", () => {
    expect(shouldRetryQuery(0, new ApiError({ status: 0, code: "NETWORK_ERROR", message: "" }))).toBe(true);
    expect(shouldRetryQuery(0, new ApiError({ status: 503, code: "SERVER_ERROR", message: "" }))).toBe(true);
    expect(shouldRetryQuery(0, new ApiError({ status: 429, code: "RATE_LIMITED", message: "" }))).toBe(true);
    expect(shouldRetryQuery(0, new ApiError({ status: 403, code: "FORBIDDEN", message: "" }))).toBe(false);
    expect(shouldRetryQuery(0, new ApiError({ status: 409, code: "POLICY_NOT_CONFIGURED", message: "" }))).toBe(
      false,
    );
    expect(shouldRetryQuery(2, new ApiError({ status: 503, code: "SERVER_ERROR", message: "" }))).toBe(false);
  });
});

describe("toSearchParams", () => {
  it("builds page, pageSize, sort, filter[] and plain params", () => {
    const params = toSearchParams({
      page: 2,
      pageSize: 500,
      sort: "-price_in_tax",
      filter: { project_id: 80, status: ["available", "reserved"], building_id: null },
      extra: { q: "10", price_min: "" },
    });
    expect(params.toString()).toBe(
      "page=2&pageSize=100&sort=-price_in_tax&filter%5Bproject_id%5D=80&filter%5Bstatus%5D%5B%5D=available&filter%5Bstatus%5D%5B%5D=reserved&q=10",
    );
  });
});

describe("unwrapList", () => {
  it("synthesizes meta for lists returned without it", () => {
    expect(unwrapList({ data: [1, 2] }).meta).toEqual({ page: 1, pageSize: 2, total: 2 });
  });
});

describe("hasPermission", () => {
  it("honours the wildcard and any-of lists", () => {
    expect(hasPermission(["*"], "finance.refund")).toBe(true);
    expect(hasPermission(["sales.view"], ["ownership.manage", "sales.view"])).toBe(true);
    expect(hasPermission(["sales.view"], "sales.manage")).toBe(false);
    expect(hasPermission(undefined, "sales.view")).toBe(false);
  });
});
