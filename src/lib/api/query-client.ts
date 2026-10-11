import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { ApiError, toApiError } from "./errors";

const MAX_GET_RETRIES = 2;

/** Retry reads only on network failures, 5xx and 429. Mutations are never auto-retried. */
export function shouldRetryQuery(failureCount: number, error: unknown) {
  if (failureCount >= MAX_GET_RETRIES) return false;
  const e = toApiError(error);
  return e.isNetwork || e.status >= 500 || e.status === 429;
}

export function retryDelay(attempt: number, error: unknown) {
  const e = error instanceof ApiError ? error : undefined;
  if (e?.status === 429 && e.retryAfter) return e.retryAfter * 1000;
  return Math.min(1000 * 2 ** attempt, 8000);
}

export function makeQueryClient(onGlobalError?: (error: ApiError) => void) {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => onGlobalError?.(toApiError(error)),
    }),
    mutationCache: new MutationCache({
      onError: (error) => onGlobalError?.(toApiError(error)),
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: shouldRetryQuery,
        retryDelay,
      },
      mutations: { retry: false },
    },
  });
}
