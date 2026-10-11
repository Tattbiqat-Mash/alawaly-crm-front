"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseAsString, useQueryStates } from "nuqs";
import { useMemo } from "react";
import { clampPageSize, listParsers } from "@/components/shared/data-table/list-params";
import type { Permission } from "@/config/permissions";
import { usePermissions } from "@/features/auth/hooks";
import { inventoryApi } from "./api";
import type { PriceChangeInput, StatusChangeInput, UnitPatch, VersionedUnit } from "./types";

const LOOKUP_STALE = 5 * 60_000;

export const inventoryKeys = {
  units: (params: unknown) => ["units", params] as const,
  unit: (id: number) => ["unit", id] as const,
  statusHistory: (id: number, page: number) => ["unit", id, "status-history", page] as const,
  priceChanges: (id: number, page: number) => ["unit", id, "price-changes", page] as const,
  ownership: (id: number) => ["unit", id, "ownership"] as const,
  eligibility: (id: number, clientId: number | null) => ["unit", id, "eligibility", clientId] as const,
  availability: (id: number) => ["unit", id, "availability"] as const,
  projects: ["projects", "all"] as const,
  buildings: ["buildings", "all"] as const,
  unitTypes: ["unit-types", "all"] as const,
};

/** Units list state lives in the URL (shareable, refresh-safe). */
export function useUnitsListState() {
  return useQueryStates(
    {
      ...listParsers,
      q: parseAsString,
      project: parseAsString,
      building: parseAsString,
      status: parseAsString,
      type: parseAsString,
      priceMin: parseAsString,
      priceMax: parseAsString,
      active: parseAsString,
    },
    { history: "replace" },
  );
}

export type UnitsListState = ReturnType<typeof useUnitsListState>[0];

export function useUnits(state: UnitsListState) {
  const params = useMemo(
    () => ({
      page: state.page,
      pageSize: clampPageSize(state.pageSize),
      sort: state.sort,
      filter: {
        project_id: state.project,
        building_id: state.building,
        status: state.status,
        unit_type_id: state.type,
        active: state.active,
      },
      extra: { q: state.q, price_min: state.priceMin, price_max: state.priceMax },
    }),
    [state],
  );
  return useQuery({
    queryKey: inventoryKeys.units(params),
    queryFn: () => inventoryApi.listUnits(params),
    // Keep the current page on screen while the next one loads (no flash on paging/filtering).
    placeholderData: keepPreviousData,
  });
}

export const useProjects = () =>
  useQuery({ queryKey: inventoryKeys.projects, queryFn: inventoryApi.projects, staleTime: LOOKUP_STALE });
export const useBuildings = () =>
  useQuery({ queryKey: inventoryKeys.buildings, queryFn: inventoryApi.buildings, staleTime: LOOKUP_STALE });
export const useUnitTypes = () =>
  useQuery({ queryKey: inventoryKeys.unitTypes, queryFn: inventoryApi.unitTypes, staleTime: LOOKUP_STALE });

export function useUnit(id: number) {
  return useQuery({
    queryKey: inventoryKeys.unit(id),
    queryFn: () => inventoryApi.getUnit(id),
    enabled: Number.isInteger(id) && id > 0,
  });
}

/** Warm the detail cache on hover/focus so "Full view" opens instantly. */
export function usePrefetchUnit() {
  const queryClient = useQueryClient();
  return (id: number) =>
    queryClient.prefetchQuery({ queryKey: inventoryKeys.unit(id), queryFn: () => inventoryApi.getUnit(id), staleTime: 30_000 });
}

function useSetUnit(id: number) {
  const queryClient = useQueryClient();
  return (next: VersionedUnit) => {
    queryClient.setQueryData(inventoryKeys.unit(id), next);
    queryClient.invalidateQueries({ queryKey: ["units"] });
  };
}

export function useUpdateUnit(id: number) {
  const setUnit = useSetUnit(id);
  return useMutation({
    mutationFn: ({ patch, etag }: { patch: UnitPatch; etag: string }) => inventoryApi.updateUnit({ id, patch, etag }),
    onSuccess: setUnit,
  });
}

export function useChangeUnitStatus(id: number) {
  const setUnit = useSetUnit(id);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { input: StatusChangeInput; etag: string; idempotencyKey: string }) =>
      inventoryApi.changeStatus({ id, ...vars }),
    onSuccess: (next) => {
      setUnit(next);
      queryClient.invalidateQueries({ queryKey: ["unit", id, "status-history"] });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.availability(id) });
    },
  });
}

export function useRequestPriceChange(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { input: PriceChangeInput; idempotencyKey: string }) => inventoryApi.requestPriceChange({ id, ...vars }),
    // The price itself does not change until a different person approves.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["unit", id, "price-changes"] }),
  });
}

function useGatedQuery<T>(permission: Permission | readonly Permission[], key: readonly unknown[], fn: () => Promise<T>, enabled = true) {
  const { can, ready } = usePermissions();
  const allowed = ready && can(permission);
  return { ...useQuery({ queryKey: key, queryFn: fn, enabled: allowed && enabled }), allowed };
}

export const useUnitStatusHistory = (id: number, page: number) =>
  useGatedQuery("inventory.view", inventoryKeys.statusHistory(id, page), () => inventoryApi.statusHistory(id, page));

export const useUnitPriceChanges = (id: number, page: number) =>
  useGatedQuery("inventory.view", inventoryKeys.priceChanges(id, page), () => inventoryApi.priceChanges(id, page));

export const useUnitOwnership = (id: number) =>
  useGatedQuery(["ownership.manage", "sales.view"], inventoryKeys.ownership(id), () => inventoryApi.ownershipHistory(id));

export const useUnitEligibility = (id: number, clientId: number | null) =>
  useGatedQuery(
    ["ownership.manage", "sales.view"],
    inventoryKeys.eligibility(id, clientId),
    () => inventoryApi.eligibility(id, clientId!),
    clientId !== null,
  );

export const useUnitAvailability = (id: number) =>
  useGatedQuery(["sales.view", "inventory.view"], inventoryKeys.availability(id), () => inventoryApi.availability(id));
