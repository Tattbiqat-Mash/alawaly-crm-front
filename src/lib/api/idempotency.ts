"use client";

import { useCallback, useState } from "react";

const newKey = () => crypto.randomUUID();

/**
 * One Idempotency-Key per user intent: created when the form opens, reused on every retry of
 * the same submission, and renewed only after success (or after IDEMPOTENCY_CONFLICT, when the
 * body changed under the same key).
 */
export function useIdempotencyKey() {
  const [key, setKey] = useState(newKey);
  const renew = useCallback(() => setKey(newKey()), []);
  return { key, renew } as const;
}

export const idempotencyHeader = (key: string) => ({ "Idempotency-Key": key });
