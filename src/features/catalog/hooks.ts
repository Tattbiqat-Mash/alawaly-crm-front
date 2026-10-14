"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseAsString, useQueryStates } from "nuqs";
import { clampPageSize, listParsers } from "@/components/shared/data-table/list-params";
import type { FeatureType, FloorInput } from "@/features/inventory/types";
import { MAX_PAGE_SIZE } from "@/lib/api/params";
import {
  catalogApi,
  type BuildingInput,
  type BuildingWithFloorsInput,
  type CloneInput,
  type FeatureInput,
  type ProjectInput,
  type UnitTemplateInput,
  type UnitTypeInput,
} from "./api";

// List state in the URL (shareable, refresh-safe).
export const useProjectsState = () =>
  useQueryStates({ ...listParsers, status: parseAsString, active: parseAsString }, { history: "replace" });
export const useBuildingsState = () =>
  useQueryStates({ ...listParsers, project: parseAsString, active: parseAsString }, { history: "replace" });
export const useUnitTypesState = () =>
  useQueryStates({ ...listParsers, tab: parseAsString.withDefault("types"), featureType: parseAsString }, { history: "replace" });
export const useUnitTemplatesState = () =>
  useQueryStates({ ...listParsers, q: parseAsString, type: parseAsString, active: parseAsString }, { history: "replace" });

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

export function useUnitTemplatesList(s: Paged & { q: string | null; type: string | null; active: string | null }) {
  const params = { ...paging(s), filter: { unit_type_id: s.type, active: s.active }, extra: { q: s.q } };
  return useQuery({
    queryKey: ["unit-templates", params],
    queryFn: () => catalogApi.unitTemplates(params),
    placeholderData: keepPreviousData,
  });
}

/** Active templates for pickers (one page of 100). */
export const useTemplateOptions = () =>
  useQuery({
    queryKey: ["unit-templates", "options"],
    queryFn: () => catalogApi.unitTemplates({ pageSize: MAX_PAGE_SIZE, sort: "style_code", filter: { active: 1 } }).then((p) => p.items),
    staleTime: 60_000,
  });

export function useFeaturesList(s: Paged & { featureType: string | null }) {
  const params = { ...paging(s), filter: { feature_type: s.featureType } };
  return useQuery({ queryKey: ["features", params], queryFn: () => catalogApi.features(params), placeholderData: keepPreviousData });
}

/** Active features of one type, for pickers. */
export const useFeatureOptions = (type: FeatureType) =>
  useQuery({
    queryKey: ["features", "options", type],
    queryFn: () => catalogApi.features({ pageSize: MAX_PAGE_SIZE, filter: { feature_type: type, active: 1 } }).then((p) => p.items),
    staleTime: 60_000,
  });

/** Full project (the list rows omit most fields). */
export const useProject = (id: number | null) =>
  useQuery({ queryKey: ["project", id], queryFn: () => catalogApi.project(id!), enabled: id !== null });

export const useBuilding = (id: number | null) =>
  useQuery({ queryKey: ["building", id], queryFn: () => catalogApi.building(id!), enabled: id !== null });

export const useFloorLayout = (id: number) =>
  useQuery({ queryKey: ["floor-templates", id], queryFn: () => catalogApi.floorLayout(id) });

export const useBuildingFeatures = (id: number) =>
  useQuery({ queryKey: ["building", id, "features"], queryFn: () => catalogApi.buildingFeatures(id) });

/** The template's features as attached (the template row's own `features` JSON may lag behind). */
export const useUnitTemplateFeatures = (id: number | null) =>
  useQuery({ queryKey: ["unit-template", id, "features"], queryFn: () => catalogApi.unitTemplateFeatures(id!), enabled: id !== null });

export const useUnitTemplate = (id: number | null) =>
  useQuery({ queryKey: ["unit-template", id], queryFn: () => catalogApi.unitTemplate(id!), enabled: id !== null });

export const useLookup = (type: string) =>
  useQuery({ queryKey: ["lookups", type], queryFn: () => catalogApi.lookups(type), staleTime: 5 * 60_000 });

const useInvalidate = () => {
  const queryClient = useQueryClient();
  return (keys: string[]) => keys.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
};

/** Create or update; refreshes every list and lookup that shows this kind of record. */
function useSave<TInput, TOut>(
  keys: string[],
  create: (body: TInput, key: string) => Promise<TOut>,
  update: (id: number, body: TInput) => Promise<TOut>,
) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, body, idempotencyKey }: { id: number | null; body: TInput; idempotencyKey: string }) =>
      id === null ? create(body, idempotencyKey) : update(id, body),
    onSuccess: () => invalidate(keys),
  });
}

export const useSaveProject = () =>
  useSave<ProjectInput, { id: number }>(["projects", "project"], catalogApi.createProject, catalogApi.updateProject);
export const useSaveBuilding = () =>
  useSave<BuildingInput, { id: number }>(["buildings", "building", "project"], catalogApi.createBuilding, catalogApi.updateBuilding);
export const useSaveUnitType = () =>
  useSave<UnitTypeInput, unknown>(["unit-types"], catalogApi.createUnitType, catalogApi.updateUnitType);

const BUILDING_KEYS = ["buildings", "building", "floor-templates", "project", "units", "unit-templates"];

export function useCreateBuildingWithFloors() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (body: BuildingWithFloorsInput) => catalogApi.createBuildingWithFloors(body), onSuccess: () => invalidate(BUILDING_KEYS) });
}

export function useAddFloorTemplates(buildingId: number) {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (floors: FloorInput[]) => catalogApi.addFloorTemplates(buildingId, floors), onSuccess: () => invalidate(BUILDING_KEYS) });
}

export function useCloneBuilding(buildingId: number) {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (body: CloneInput) => catalogApi.cloneBuilding(buildingId, body), onSuccess: () => invalidate(BUILDING_KEYS) });
}

export function useSetBuildingFeatures(buildingId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (featureIds: number[]) => catalogApi.setBuildingFeatures(buildingId, featureIds),
    onSuccess: (features) => queryClient.setQueryData(["building", buildingId, "features"], features),
  });
}

/** Create, or update the template and (when changed) its features. */
export function useSaveUnitTemplate() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, body, featureIds }: { id: number | null; body: UnitTemplateInput; featureIds: number[] | null }) => {
      if (id === null) return { id: (await catalogApi.createUnitTemplate(body)).id, meta: undefined };
      const saved = Object.keys(body).length ? await catalogApi.updateUnitTemplate(id, body) : null;
      const features = featureIds ? await catalogApi.setUnitTemplateFeatures(id, featureIds) : null;
      const unitsUpdated = Math.max(saved?.meta?.units_updated ?? 0, features?.meta?.units_updated ?? 0);
      return { id, meta: { units_updated: unitsUpdated, prices_not_propagated: saved?.meta?.prices_not_propagated ?? [] } };
    },
    // Settled, not success: a PATCH can land even when the features PUT after it fails.
    onSettled: () => invalidate(["unit-templates", "unit-template", "units", "unit"]),
  });
}

export function useSaveFeature() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, body }: { id: number | null; body: FeatureInput }) =>
      id === null ? catalogApi.createFeature(body) : catalogApi.updateFeature(id, body),
    onSuccess: () => invalidate(["features"]),
  });
}
