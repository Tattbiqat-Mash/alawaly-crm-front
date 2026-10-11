import { staffEndpoints } from "@/config/endpoints";
import type { Building, LookupValue, Project, UnitType } from "@/features/inventory/types";
import { staffApi } from "@/lib/api/client";
import { unwrapList, type Envelope, type ListEnvelope } from "@/lib/api/envelope";
import { idempotencyHeader } from "@/lib/api/idempotency";
import { MAX_PAGE_SIZE, toSearchParams, type ListParams } from "@/lib/api/params";

const ep = staffEndpoints;

const list = <T>(path: string, params: ListParams) =>
  staffApi.get<ListEnvelope<T>>(path, { params: toSearchParams(params) }).then((r) => unwrapList(r.data));
const data = <T>(p: Promise<{ data: Envelope<T> }>) => p.then((r) => r.data.data);

export type ProjectInput = Partial<{
  nameAr: string;
  nameEn: string;
  status: string | null;
  availability: string | null;
  developing_percentage: number | null;
  display_order: number | null;
  featured: boolean;
  active: boolean;
}>;

export type BuildingInput = Partial<{
  project_id: number;
  building_code: string;
  floors_count: number | null;
  addressAr: string | null;
  addressEn: string | null;
  active: boolean;
}>;

export type UnitTypeInput = Partial<{ nameAr: string; nameEn: string; active: boolean }>;

export const catalogApi = {
  projects: (params: ListParams) => list<Project>(ep.projects, params),
  project: (id: number) => data(staffApi.get<Envelope<Project>>(ep.project(id))),
  createProject: (body: ProjectInput, key: string) =>
    data(staffApi.post<Envelope<Project>>(ep.projects, body, { headers: idempotencyHeader(key) })),
  updateProject: (id: number, body: ProjectInput) => data(staffApi.patch<Envelope<Project>>(ep.project(id), body)),

  buildings: (params: ListParams) => list<Building>(ep.buildings, params),
  createBuilding: (body: BuildingInput, key: string) =>
    data(staffApi.post<Envelope<Building>>(ep.buildings, body, { headers: idempotencyHeader(key) })),
  updateBuilding: (id: number, body: BuildingInput) => data(staffApi.patch<Envelope<Building>>(ep.building(id), body)),

  unitTypes: (params: ListParams) => list<UnitType>(ep.unitTypes, params),
  createUnitType: (body: UnitTypeInput, key: string) =>
    data(staffApi.post<Envelope<UnitType>>(ep.unitTypes, body, { headers: idempotencyHeader(key) })),
  updateUnitType: (id: number, body: UnitTypeInput) => data(staffApi.patch<Envelope<UnitType>>(ep.unitType(id), body)),

  /** Unknown lookup types answer with an empty list. */
  lookups: (type: string) => list<LookupValue>(ep.lookups(type), { pageSize: MAX_PAGE_SIZE }),
};
