"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { clampPageSize, listParsers } from "@/components/shared/data-table/list-params";
import { integrationsApi, type ExternalRefInput } from "./api";

type Paged = { page: number; pageSize: number; sort: string | null };

export const useIntegrationsState = () =>
  useQueryStates(
    {
      ...listParsers,
      tab: parseAsStringLiteral(["events", "refs"] as const).withDefault("events"),
      status: parseAsString,
      system: parseAsString,
      entityType: parseAsString,
      entityId: parseAsString,
    },
    { history: "replace" },
  );

export const useIntegrationHealthReport = () =>
  useQuery({ queryKey: ["integrations", "health"], queryFn: integrationsApi.health, refetchOnWindowFocus: true });

export function useIntegrationEvents(s: Paged & { status: string | null; system: string | null }, enabled: boolean) {
  const params = { page: s.page, pageSize: clampPageSize(s.pageSize), sort: s.sort ?? "-id", filter: { status: s.status, system: s.system } };
  return useQuery({ queryKey: ["integrations", "events", params], queryFn: () => integrationsApi.events(params), placeholderData: keepPreviousData, enabled });
}

export function useExternalRefs(s: Paged & { system: string | null; entityType: string | null; entityId: string | null }, enabled: boolean) {
  const params = { page: s.page, pageSize: clampPageSize(s.pageSize), sort: s.sort ?? "-id", filter: { system: s.system, entity_type: s.entityType, entity_id: s.entityId } };
  return useQuery({ queryKey: ["integrations", "refs", params], queryFn: () => integrationsApi.refs(params), placeholderData: keepPreviousData, enabled });
}

function useInvalidating<TVars, TOut>(fn: (vars: TVars) => Promise<TOut>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export const useRetryEvent = () => useInvalidating((id: number) => integrationsApi.retry(id));
export const useLinkExternalRef = () => useInvalidating(({ body, key }: { body: ExternalRefInput; key: string }) => integrationsApi.linkRef(body, key));
