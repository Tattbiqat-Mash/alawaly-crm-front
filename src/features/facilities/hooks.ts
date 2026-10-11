"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseAsBoolean, parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { clampPageSize, listParsers } from "@/components/shared/data-table/list-params";
import { facilitiesApi } from "./api";

type Paged = { page: number; pageSize: number; sort: string | null };
const paging = (s: Paged, sort: string) => ({ page: s.page, pageSize: clampPageSize(s.pageSize), sort: s.sort ?? sort });

function useInvalidating<TVars, TOut>(fn: (vars: TVars) => Promise<TOut>, keys: string[]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      for (const key of [...keys, "dashboard"]) queryClient.invalidateQueries({ queryKey: [key] });
    },
  });
}

// ---------- S28 facilities and assets ----------

export const useFacilitiesState = () =>
  useQueryStates({ ...listParsers, facility: parseAsInteger, retired: parseAsBoolean.withDefault(false) }, { history: "replace" });

export function useFacilities(s: Paged) {
  const params = paging(s, "-id");
  return useQuery({ queryKey: ["facilities", params], queryFn: () => facilitiesApi.facilities(params), placeholderData: keepPreviousData });
}

/** All facilities / assets (100 max) for pickers and labels. */
export const useAllFacilities = () =>
  useQuery({ queryKey: ["facilities", "all"], queryFn: () => facilitiesApi.facilities({ pageSize: 100 }).then((p) => p.items), staleTime: 5 * 60_000 });
export const useAllAssets = () =>
  useQuery({ queryKey: ["assets", "all"], queryFn: () => facilitiesApi.assets({ pageSize: 100 }).then((p) => p.items), staleTime: 5 * 60_000 });

export function useAssets(facilityId: number | null, includeRetired: boolean) {
  const params = { pageSize: 100, filter: { facility_id: facilityId, status: includeRetired ? null : ["in_service", "out_of_service"] } };
  return useQuery({ queryKey: ["assets", params], queryFn: () => facilitiesApi.assets(params), enabled: facilityId !== null });
}

export const useAssetHistory = (id: number | null) =>
  useQuery({ queryKey: ["assets", "history", id], queryFn: () => facilitiesApi.assetHistory(id!), enabled: id !== null });

export const useSaveFacility = () =>
  useInvalidating(({ id, body, key }: { id: number | null; body: Record<string, unknown>; key: string }) => facilitiesApi.saveFacility(id, body, key), ["facilities"]);
export const useSaveAsset = () =>
  useInvalidating(({ id, body, key }: { id: number | null; body: Record<string, unknown>; key: string }) => facilitiesApi.saveAsset(id, body, key), ["assets"]);

// ---------- S29 maintenance plan ----------

export const usePlanState = () =>
  useQueryStates(
    { ...listParsers, tab: parseAsString.withDefault("tasks"), overdue: parseAsBoolean.withDefault(true), status: parseAsString, asset: parseAsString },
    { history: "replace" },
  );

export function useTasks(s: Paged & { overdue: boolean; status: string | null; asset: string | null }, enabled: boolean) {
  const params = { ...paging(s, "due_on"), filter: { status: s.status, asset_id: s.asset }, extra: { overdue: s.overdue ? 1 : null } };
  return useQuery({
    queryKey: ["pm-tasks", params],
    queryFn: () => facilitiesApi.tasks(params),
    placeholderData: keepPreviousData,
    enabled,
    refetchOnWindowFocus: true, // overdue is set by a nightly job
  });
}

export const useAllSchedules = () =>
  useQuery({ queryKey: ["pm-schedules", "all"], queryFn: () => facilitiesApi.schedules({ pageSize: 100 }).then((p) => p.items), staleTime: 60_000 });

export function useSchedules(s: Paged, enabled: boolean) {
  const params = paging(s, "next_due_on");
  return useQuery({ queryKey: ["pm-schedules", params], queryFn: () => facilitiesApi.schedules(params), placeholderData: keepPreviousData, enabled });
}

export const useTaskAction = () =>
  useInvalidating(({ id, action, notes }: { id: number; action: "start" | "complete" | "skip"; notes?: string }) => facilitiesApi.taskAction(id, action, notes), [
    "pm-tasks",
    "assets",
  ]);
export const useSaveSchedule = () =>
  useInvalidating(({ id, body, key }: { id: number | null; body: Record<string, unknown>; key: string }) => facilitiesApi.saveSchedule(id, body, key), ["pm-schedules"]);

// ---------- S30 incidents ----------

export const useIncidentsState = () =>
  useQueryStates({ ...listParsers, status: parseAsString, severity: parseAsString, facility: parseAsString }, { history: "replace" });

export function useIncidents(s: Paged & { status: string | null; severity: string | null; facility: string | null }) {
  const params = { ...paging(s, "-id"), filter: { status: s.status, severity: s.severity, facility_id: s.facility } };
  return useQuery({ queryKey: ["incidents", params], queryFn: () => facilitiesApi.incidents(params), placeholderData: keepPreviousData, refetchOnWindowFocus: true });
}

export const useReportIncident = () =>
  useInvalidating(({ body, key }: { body: Record<string, unknown>; key: string }) => facilitiesApi.reportIncident(body, key), ["incidents", "assets"]);
export const useIncidentAction = () =>
  useInvalidating(
    ({ id, action, resolution }: { id: number; action: "investigate" | "resolve" | "close"; resolution?: string }) =>
      facilitiesApi.incidentAction(id, action, resolution),
    ["incidents", "assets"],
  );
