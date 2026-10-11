"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseAsString, useQueryStates } from "nuqs";
import { clampPageSize, listParsers } from "@/components/shared/data-table/list-params";
import type { Permission } from "@/config/permissions";
import { usePermissions } from "@/features/auth/hooks";
import { maintenanceApi, type Resource } from "./api";

export const useMaintenanceState = () =>
  useQueryStates({ ...listParsers, tab: parseAsString.withDefault("technicians") }, { history: "replace" });

export function useResourceList<R extends Resource>(resource: R, s: { page: number; pageSize: number; sort: string | null }, enabled = true) {
  const params = { page: s.page, pageSize: clampPageSize(s.pageSize), sort: s.sort };
  return useQuery({
    queryKey: ["maintenance", resource, params],
    queryFn: () => maintenanceApi.list(resource, params),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** Everyone of a kind (100 max) for pickers and labels. Needs one of the given permissions. */
export function useAllResources<R extends Resource>(resource: R, permission: Permission | readonly Permission[] = "maint.manage") {
  const { can, ready } = usePermissions();
  return useQuery({
    queryKey: ["maintenance", resource, "all"],
    queryFn: () => maintenanceApi.list(resource, { pageSize: 100 }).then((p) => p.items),
    staleTime: 5 * 60_000,
    enabled: ready && can(permission),
  });
}

export function useSaveResource<R extends Resource>(resource: R) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body, key }: { id: number | null; body: Record<string, unknown>; key: string }) =>
      id === null ? maintenanceApi.create(resource, body, key) : maintenanceApi.update(resource, id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["maintenance", resource] }),
  });
}
