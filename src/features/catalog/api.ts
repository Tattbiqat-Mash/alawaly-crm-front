import { staffEndpoints } from "@/config/endpoints";
import type {
  Building,
  CloneResult,
  Feature,
  FeatureType,
  FloorInput,
  FloorLayout,
  LookupValue,
  Project,
  ProjectDetail,
  ProjectDocument,
  TemplateSaveMeta,
  UnitMedia,
  UnitTemplate,
  UnitTemplateDetail,
  UnitType,
} from "@/features/inventory/types";
import { staffApi } from "@/lib/api/client";
import { unwrapList, type Envelope, type ListEnvelope } from "@/lib/api/envelope";
import { idempotencyHeader } from "@/lib/api/idempotency";
import { MAX_PAGE_SIZE, toSearchParams, type ListParams } from "@/lib/api/params";

const ep = staffEndpoints;

const list = <T>(path: string, params: ListParams) =>
  staffApi.get<ListEnvelope<T>>(path, { params: toSearchParams(params) }).then((r) => unwrapList(r.data));
const data = <T>(p: Promise<{ data: Envelope<T> }>) => p.then((r) => r.data.data);

/** Every project field the API accepts. Arrays (media, documents, features) replace the stored list. */
export type ProjectInput = Partial<{
  nameAr: string;
  nameEn: string;
  project_code: string | null;
  developer_id: number | null;
  country_id: number | null;
  city_id: number | null;
  status: string | null;
  availability: string | null;
  license_num: string | null;
  addressEn: string | null;
  location_lang_lat: string | null;
  developing_percentage: number | null;
  total_area: number | null;
  developing_start_date: string | null;
  developing_end_date: string | null;
  estimated_delivery_date: string | null;
  descriptionEn: string | null;
  media: string[];
  documents: ProjectDocument[];
  project_image: string | null;
  features: number[];
  display_order: number | null;
  featured: boolean;
  active: boolean;
  /** Create only; without it a first stage is created automatically. */
  stages: { nameAr: string; nameEn: string; start_date: string | null }[];
}>;

export type BuildingInput = Partial<{
  project_id: number;
  stage_id: number | null;
  building_code: string;
  floors_count: number | null;
  addressAr: string | null;
  addressEn: string | null;
  active: boolean;
}>;

/** POST /buildings/with-floors: building, features and every unit in one transaction (max 500 units). */
export type BuildingWithFloorsInput = BuildingInput & {
  project_id: number;
  building_code: string;
  feature_ids?: number[];
  unit_code_pattern?: string;
  floors: FloorInput[];
};

export type FloorTemplatesResult = { units_created: number; unit_ids: number[]; layout: FloorLayout };

export type CloneInput = { copies: number; building_code_pattern?: string; unit_code_pattern?: string };

export type UnitTypeInput = Partial<{ nameAr: string; nameEn: string; active: boolean }>;

export type FeatureInput = Partial<{ nameAr: string; nameEn: string; feature_type: FeatureType; active: boolean }>;

export type UnitTemplateInput = Partial<{
  style_code: string;
  nameAr: string | null;
  nameEn: string | null;
  unit_type_id: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  entrances: number | null;
  area_m2: number | null;
  building_area: number | null;
  terrace_area: number | null;
  price_ex_tax: number | null;
  price_in_tax: number | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  unit_media: UnitMedia;
  /** Create only; an existing template's features go through PUT …/features. */
  features: number[];
  active: boolean;
}>;

export const catalogApi = {
  projects: (params: ListParams) => list<Project>(ep.projects, params),
  project: (id: number) => data(staffApi.get<Envelope<ProjectDetail>>(ep.project(id))),
  createProject: (body: ProjectInput, key: string) =>
    data(staffApi.post<Envelope<ProjectDetail>>(ep.projects, body, { headers: idempotencyHeader(key) })),
  updateProject: (id: number, body: ProjectInput) => data(staffApi.patch<Envelope<ProjectDetail>>(ep.project(id), body)),

  buildings: (params: ListParams) => list<Building>(ep.buildings, params),
  building: (id: number) => data(staffApi.get<Envelope<Building>>(ep.building(id))),
  createBuilding: (body: BuildingInput, key: string) =>
    data(staffApi.post<Envelope<Building>>(ep.buildings, body, { headers: idempotencyHeader(key) })),
  updateBuilding: (id: number, body: BuildingInput) => data(staffApi.patch<Envelope<Building>>(ep.building(id), body)),
  createBuildingWithFloors: (body: BuildingWithFloorsInput) =>
    data(staffApi.post<Envelope<FloorTemplatesResult & { building_id: number }>>(ep.buildingWithFloors, body)),
  floorLayout: (id: number) => data(staffApi.get<Envelope<FloorLayout>>(ep.buildingFloorTemplates(id))),
  /** Numbering continues after the highest unit on each floor; floors_count grows when needed. */
  addFloorTemplates: (id: number, floors: FloorInput[]) =>
    data(staffApi.post<Envelope<FloorTemplatesResult>>(ep.buildingFloorTemplates(id), { floors })),
  /** Not idempotent: the caller disables the button while it runs. */
  cloneBuilding: (id: number, body: CloneInput) => data(staffApi.post<Envelope<CloneResult[]>>(ep.cloneBuilding(id), body)),
  buildingFeatures: (id: number) => data(staffApi.get<Envelope<Feature[]>>(ep.buildingFeatures(id))),
  setBuildingFeatures: (id: number, featureIds: number[]) =>
    data(staffApi.put<Envelope<Feature[]>>(ep.buildingFeatures(id), { feature_ids: featureIds })),

  unitTypes: (params: ListParams) => list<UnitType>(ep.unitTypes, params),
  createUnitType: (body: UnitTypeInput, key: string) =>
    data(staffApi.post<Envelope<UnitType>>(ep.unitTypes, body, { headers: idempotencyHeader(key) })),
  updateUnitType: (id: number, body: UnitTypeInput) => data(staffApi.patch<Envelope<UnitType>>(ep.unitType(id), body)),

  unitTemplates: (params: ListParams) => list<UnitTemplate>(ep.unitTemplates, params),
  unitTemplate: (id: number) => data(staffApi.get<Envelope<UnitTemplateDetail>>(ep.unitTemplate(id))),
  createUnitTemplate: (body: UnitTemplateInput) => data(staffApi.post<Envelope<UnitTemplateDetail>>(ep.unitTemplates, body)),
  /** Pushed to linked units except overridden fields; prices are never pushed (meta.prices_not_propagated). */
  updateUnitTemplate: (id: number, body: UnitTemplateInput) =>
    staffApi
      .patch<Envelope<UnitTemplateDetail> & { meta?: TemplateSaveMeta }>(ep.unitTemplate(id), body)
      .then((r) => ({ template: r.data.data, meta: r.data.meta })),
  unitTemplateFeatures: (id: number) => data(staffApi.get<Envelope<Feature[]>>(ep.unitTemplateFeatures(id))),
  setUnitTemplateFeatures: (id: number, featureIds: number[]) =>
    staffApi
      .put<Envelope<Feature[]> & { meta?: { units_updated: number } }>(ep.unitTemplateFeatures(id), { feature_ids: featureIds })
      .then((r) => ({ features: r.data.data, meta: r.data.meta })),

  features: (params: ListParams) => list<Feature>(ep.features, params),
  createFeature: (body: FeatureInput) => data(staffApi.post<Envelope<Feature>>(ep.features, body)),
  /** Features are never deleted: send active=false to retire one. */
  updateFeature: (id: number, body: FeatureInput) => data(staffApi.patch<Envelope<Feature>>(ep.feature(id), body)),

  /** Unknown lookup types answer with an empty list. */
  lookups: (type: string) => list<LookupValue>(ep.lookups(type), { pageSize: MAX_PAGE_SIZE }),
};
