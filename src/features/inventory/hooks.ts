"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
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

export const UNITS_VIEWS = ["table", "plan"] as const;
export type UnitsViewMode = (typeof UNITS_VIEWS)[number];

/** Units list state lives in the URL (shareable, refresh-safe), including the table/plan view. */
export function useUnitsListState() {
  return useQueryStates(
    {
      ...listParsers,
      view: parseAsStringLiteral(UNITS_VIEWS).withDefault("table"),
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

export const CLEARED_UNIT_FILTERS = {
  q: null,
  project: null,
  building: null,
  status: null,
  type: null,
  priceMin: null,
  priceMax: null,
  active: null,
  page: 1,
} satisfies Partial<UnitsListState>;

/** Filters that pick units inside the chosen project/building (the plan dims what they leave out). */
export const hasNarrowingFilters = (s: UnitsListState) => Boolean(s.q || s.status || s.type || s.priceMin || s.priceMax || s.active);

const unitFilterParams = (s: UnitsListState) => ({
  filter: { project_id: s.project, building_id: s.building, status: s.status, unit_type_id: s.type, active: s.active },
  extra: { q: s.q, price_min: s.priceMin, price_max: s.priceMax },
});

export function useUnits(state: UnitsListState) {
  const params = useMemo(
    () => ({ page: state.page, pageSize: clampPageSize(state.pageSize), sort: state.sort, ...unitFilterParams(state) }),
    [state],
  );
  return useQuery({
    queryKey: inventoryKeys.units(params),
    queryFn: () => inventoryApi.listUnits(params),
    // Keep the current page on screen while the next one loads (no flash on paging/filtering).
    placeholderData: keepPreviousData,
  });
}

/**
 * Units for the site plan. `scope` is every unit of the chosen project (or building), so buildings
 * are drawn whole; `matches` holds the ids the other filters keep (null when nothing narrows).
 * The server applies the filters in both cases, exactly as for the table.
 */
export function useSitePlanUnits(state: UnitsListState) {
  const narrowed = hasNarrowingFilters(state);
  const scopeParams = useMemo(
    () => ({ sort: "unit_number", filter: { project_id: state.project, building_id: state.building } }),
    [state.project, state.building],
  );
  const matchParams = useMemo(() => ({ sort: "unit_number", ...unitFilterParams(state) }), [state]);

  const scope = useQuery({
    queryKey: ["units", "plan", scopeParams],
    queryFn: () => inventoryApi.listAllUnits(scopeParams),
    enabled: state.project !== null || state.building !== null,
    staleTime: 30_000,
  });
  const match = useQuery({
    queryKey: ["units", "plan", matchParams],
    queryFn: () => inventoryApi.listAllUnits(matchParams),
    enabled: narrowed,
    staleTime: 30_000,
    // Typing in search keeps the current highlight until the new one arrives.
    placeholderData: keepPreviousData,
  });

  const matches = useMemo(() => (narrowed && match.data ? new Set(match.data.items.map((u) => u.id)) : null), [narrowed, match.data]);
  return { scope, match, matches, narrowed };
}

export const useDuplicates =() => useQuery({ queryKey: ["units-duplicates"], queryFn: inventoryApi.duplicates });

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

/** Unit search for pickers (number, code or CRM id), optionally limited to some statuses. */
export function useUnitSearch(q: string, statuses: readonly string[] = []) {
  const term = q.trim();
  const params = { page: 1, pageSize: 8, sort: "unit_number", filter: { status: statuses.length ? statuses : null }, extra: { q: term } };
  return useQuery({
    queryKey: ["units", "search", params],
    queryFn: () => inventoryApi.listUnits(params),
    enabled: term.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}
