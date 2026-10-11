"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseAsString, useQueryStates } from "nuqs";
import { clampPageSize, listParsers } from "@/components/shared/data-table/list-params";
import type { ServiceAction } from "@/config/statuses";
import { serviceApi, type ActionBody } from "./api";

export const useServiceDeskState = () =>
  useQueryStates(
    {
      ...listParsers,
      sort: parseAsString.withDefault("-priority"),
      status: parseAsString,
      type: parseAsString,
      priority: parseAsString,
      technician: parseAsString,
      unit: parseAsString,
    },
    { history: "replace" },
  );
export type ServiceDeskState = ReturnType<typeof useServiceDeskState>[0];

export function useServiceRequests(s: ServiceDeskState) {
  const params = {
    page: s.page,
    pageSize: clampPageSize(s.pageSize),
    sort: s.sort,
    filter: { status: s.status, type: s.type, priority: s.priority, technician_id: s.technician, unit_id: s.unit },
  };
  return useQuery({
    queryKey: ["service-requests", params],
    queryFn: () => serviceApi.list(params),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: true, // owners create and react to requests from the portal
  });
}

export const useServiceRequest = (id: number) =>
  useQuery({ queryKey: ["service-request", id], queryFn: () => serviceApi.get(id), enabled: id > 0, refetchOnWindowFocus: true });

function useServiceMutation<TVars, TOut>(fn: (vars: TVars) => Promise<TOut>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    // Also on error: INVALID_TRANSITION means our copy is stale, so reload it.
    onSettled: () => {
      for (const key of ["service-request", "service-requests", "dashboard"]) queryClient.invalidateQueries({ queryKey: [key] });
    },
  });
}

export const useServiceAction = (id: number) =>
  useServiceMutation(({ action, body }: { action: ServiceAction; body?: ActionBody }) => serviceApi.act(id, action, body));

export const useVisitMaterials = (visitId: number) =>
  useQuery({ queryKey: ["service-request", "materials", visitId], queryFn: () => serviceApi.materials(visitId) });

export const useAddMaterial = (visitId: number) =>
  useServiceMutation((body: { name: string; quantity: string; unit_cost: string }) => serviceApi.addMaterial(visitId, body));

export const useRescheduleVisit = () =>
  useServiceMutation(({ visitId, at }: { visitId: number; at: string }) => serviceApi.rescheduleVisit(visitId, at));
