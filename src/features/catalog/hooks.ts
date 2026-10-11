"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseAsString, useQueryStates } from "nuqs";
import { clampPageSize, listParsers } from "@/components/shared/data-table/list-params";
import { catalogApi, type BuildingInput, type ProjectInput, type UnitTypeInput } from "./api";

// List state in the URL (shareable, refresh-safe).
export const useProjectsState = () =>
  useQueryStates({ ...listParsers, status: parseAsString, active: parseAsString }, { history: "replace" });
export const useBuildingsState = () =>
  useQueryStates({ ...listParsers, project: parseAsString, active: parseAsString }, { history: "replace" });
export const useUnitTypesState = () =>
  useQueryStates({ ...listParsers, tab: parseAsString.withDefault("types") }, { history: "replace" });

type Paged = { page: number; pageSize: number; sort: string | null };
const paging = (s: Paged) => ({ page: s.page, pageSize: clampPageSize(s.pageSize), sort: s.sort });

export function useProjectsList(s: Paged & { status: string | null; active: string | null }) {
  const params = { ...paging(s), filter: { status: s.status, active: s.active } };
  return useQuery({ queryKey: ["projects", params], queryFn: () => catalogApi.projects(params), placeholderData: keepPreviousData });
}

export function useBuildingsList(s: Paged & { project: string | null; active: string | null }) {
  const params = { ...paging(s), filter: { project_id: s.project, active: s.active } };
  return useQuery({ queryKey: ["buildings", params], queryFn: () => catalogApi.buildings(params), placeholderData: keepPreviousData });
}

export function useUnitTypesList(s: Paged) {
  const params = paging(s);
  return useQuery({ queryKey: ["unit-types", params], queryFn: () => catalogApi.unitTypes(params), placeholderData: keepPreviousData });
}

/** Full project (the list rows omit some fields, e.g. completion %). */
export const useProject = (id: number | null) =>
  useQuery({ queryKey: ["project", id], queryFn: () => catalogApi.project(id!), enabled: id !== null });

export const useLookup = (type: string) =>
  useQuery({ queryKey: ["lookups", type], queryFn: () => catalogApi.lookups(type), staleTime: 5 * 60_000 });

/** Create or update; refreshes every list and lookup that shows this kind of record. */
function useSave<TInput, TOut>(
  keys: string[],
  create: (body: TInput, key: string) => Promise<TOut>,
  update: (id: number, body: TInput) => Promise<TOut>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body, idempotencyKey }: { id: number | null; body: TInput; idempotencyKey: string }) =>
      id === null ? create(body, idempotencyKey) : update(id, body),
    onSuccess: () => keys.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] })),
  });
}

export const useSaveProject = () =>
  useSave<ProjectInput, unknown>(["projects", "project"], catalogApi.createProject, catalogApi.updateProject);
export const useSaveBuilding = () =>
  useSave<BuildingInput, unknown>(["buildings"], catalogApi.createBuilding, catalogApi.updateBuilding);
export const useSaveUnitType = () =>
  useSave<UnitTypeInput, unknown>(["unit-types"], catalogApi.createUnitType, catalogApi.updateUnitType);
