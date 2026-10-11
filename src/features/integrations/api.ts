import { staffEndpoints } from "@/config/endpoints";
import type { IntegrationHealth } from "@/features/dashboard/types";
import { staffApi } from "@/lib/api/client";
import { unwrapList, type Envelope, type ListEnvelope } from "@/lib/api/envelope";
import { idempotencyHeader } from "@/lib/api/idempotency";
import { toSearchParams, type ListParams } from "@/lib/api/params";

export type { IntegrationHealth };

export const EVENT_STATUSES = ["pending", "sent", "failed", "dead"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

/** Entity types offered when linking an external id; the API stores any type name. */
export const REF_ENTITY_TYPES = ["client", "unit", "reservation", "sale", "payment_transaction", "project"] as const;

export type IntegrationEvent = {
  id: number;
  system: string;
  event: string;
  idempotency_key: string;
  status: string;
  attempts: number;
  next_retry_at: string | null;
  last_error: string | null;
  sent_at: string | null;
  created_at: string | null;
};

export type ExternalRef = {
  id: number;
  system: string;
  entity_type: string;
  entity_id: number;
  external_id: string;
  created_at: string | null;
};

export type ExternalRefInput = Omit<ExternalRef, "id" | "created_at">;

const ep = staffEndpoints;

export const integrationsApi = {
  health: () => staffApi.get<Envelope<IntegrationHealth>>(ep.reports.integrations).then((r) => r.data.data),
  events: (params: ListParams) =>
    staffApi.get<ListEnvelope<IntegrationEvent>>(ep.integrationEvents, { params: toSearchParams(params) }).then((r) => unwrapList(r.data)),
  /** Puts a failed or dead event back in the queue. */
  retry: (id: number) => staffApi.post<Envelope<IntegrationEvent>>(ep.integrationEventRetry(id)).then((r) => r.data.data),
  refs: (params: ListParams) => staffApi.get<ListEnvelope<ExternalRef>>(ep.externalRefs, { params: toSearchParams(params) }).then((r) => unwrapList(r.data)),
  /** A partner id already linked to another record is refused, never merged. */
  linkRef: (body: ExternalRefInput, key: string) =>
    staffApi.post<Envelope<ExternalRef>>(ep.externalRefs, body, { headers: idempotencyHeader(key) }).then((r) => r.data.data),
};
