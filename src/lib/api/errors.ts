import { isAxiosError } from "axios";

/** Error codes from the Frontend Guide, plus UPSTREAM_UNAVAILABLE / CODE_SESSION_EXPIRED raised by our BFF. */
export const KNOWN_ERROR_CODES = [
  "IDEMPOTENCY_KEY_REQUIRED",
  "UNAUTHENTICATED",
  "INVALID_CREDENTIALS",
  "INVALID_CODE",
  "FORBIDDEN",
  "MANDATE_SCOPE",
  "NOT_FOUND",
  "UNIT_NOT_AVAILABLE",
  "VERSION_CONFLICT",
  "POLICY_NOT_CONFIGURED",
  "INVALID_STATE",
  "PROVIDER_NOT_CONFIGURED",
  "IDEMPOTENCY_CONFLICT",
  "VALIDATION_FAILED",
  "NOT_ELIGIBLE",
  "INVALID_TRANSITION",
  "FOUR_EYES_REQUIRED",
  "AMOUNT_MISMATCH",
  "RATE_LIMITED",
  "SERVER_ERROR",
  "CONTRACT_DOCUMENT_REQUIRED",
  "MANDATE_DOCUMENT_REQUIRED",
  "FIELD_NOT_WRITABLE",
  // Screen-specific codes named in the wireframes.
  "ALREADY_DECIDED",
  "RESERVATION_MISMATCH",
  "UNIT_ALREADY_SOLD",
  "PAYMENTS_OUTSTANDING",
  "HANDOVER_NOT_ACCEPTED",
  "ALREADY_PAID",
  "REFUND_EXCEEDS_PAYMENT",
  "OPEN_SNAGS",
  "NO_CURRENT_OWNER",
  "SAME_OWNER",
  "ALREADY_APPLIED",
  "UPSTREAM_UNAVAILABLE",
  "CODE_SESSION_EXPIRED",
  "NETWORK_ERROR",
] as const;

export type KnownErrorCode = (typeof KNOWN_ERROR_CODES)[number];

export type ErrorDetails = Record<string, unknown>;

/** The one error shape UI code sees. Branch on `code`, never on `message`. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ErrorDetails | undefined;
  readonly correlationId: string | undefined;
  readonly retryAfter: number | undefined;

  constructor(opts: {
    status: number;
    code: string;
    message: string;
    details?: ErrorDetails;
    correlationId?: string;
    retryAfter?: number;
  }) {
    super(opts.message);
    this.name = "ApiError";
    this.status = opts.status;
    this.code = opts.code;
    this.details = opts.details;
    this.correlationId = opts.correlationId;
    this.retryAfter = opts.retryAfter;
  }

  get isNetwork() {
    return this.code === "NETWORK_ERROR" || this.code === "UPSTREAM_UNAVAILABLE";
  }

  get isConflict() {
    return this.code === "VERSION_CONFLICT" || this.status === 412;
  }
}

type ErrorBody = {
  error?: { code?: string; message?: string; details?: ErrorDetails; correlation_id?: string };
};

const statusFallbackCode = (status: number) => {
  if (status === 401) return "UNAUTHENTICATED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 412) return "VERSION_CONFLICT";
  if (status === 422) return "VALIDATION_FAILED";
  if (status === 429) return "RATE_LIMITED";
  return "SERVER_ERROR";
};

export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;

  if (isAxiosError(err)) {
    if (!err.response) {
      return new ApiError({ status: 0, code: "NETWORK_ERROR", message: err.message });
    }
    const { status, data, headers } = err.response;
    const body = (typeof data === "object" && data !== null ? data : {}) as ErrorBody;
    const retryAfterHeader = Number(headers?.["retry-after"]);
    return new ApiError({
      status,
      code: body.error?.code ?? statusFallbackCode(status),
      message: body.error?.message ?? err.message,
      details: body.error?.details,
      correlationId: body.error?.correlation_id,
      retryAfter: Number.isFinite(retryAfterHeader) ? retryAfterHeader : undefined,
    });
  }

  return new ApiError({
    status: 0,
    code: "NETWORK_ERROR",
    message: err instanceof Error ? err.message : "Unknown error",
  });
}

/** VALIDATION_FAILED.details maps each field to a list of messages. */
export function fieldErrors(error: ApiError): Record<string, string[]> | undefined {
  if (error.code !== "VALIDATION_FAILED" || !error.details) return undefined;
  const entries = Object.entries(error.details).filter((entry): entry is [string, string[]] =>
    Array.isArray(entry[1]),
  );
  return entries.length ? Object.fromEntries(entries) : undefined;
}
