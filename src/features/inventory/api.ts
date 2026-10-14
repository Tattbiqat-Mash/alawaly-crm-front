import type { AxiosResponse } from "axios";
import { staffEndpoints } from "@/config/endpoints";
import { staffApi } from "@/lib/api/client";
import { pageCount, unwrapList, type Envelope, type ListEnvelope } from "@/lib/api/envelope";
import { downloadFile } from "@/lib/api/files";
import { idempotencyHeader } from "@/lib/api/idempotency";
import { MAX_PAGE_SIZE, toSearchParams, type ListParams } from "@/lib/api/params";
import type {
  Availability,
  Building,
  Eligibility,
  Feature,
  OwnershipRecord,
  PriceChange,
  PriceChangeInput,
  Project,
  StatusChangeInput,
  StatusHistoryEntry,
  Unit,
  UnitListItem,
  UnitPatch,
  UnitType,
  VersionedUnit,
} from "./types";

const ep = staffEndpoints;

/** POST /unit-templates/{id}/units: only the unit's own details; the rest comes from the template. */
export type NewTemplateUnits = {
  building_id: number;
  units: { unit_code: string; unit_number: string; floor_num: number; unit_deed_no?: string; facade_id?: number }[];
};

const list = <T>(path: string, params: ListParams = {}) =>
  staffApi.get<ListEnvelope<T>>(path, { params: toSearchParams(params) }).then((r) => unwrapList(r.data));

/** ETag is the unit's version ("3"); fall back to it if a proxy drops the header. */
const versioned = (res: AxiosResponse<Envelope<Unit>>): VersionedUnit => ({
  unit: res.data.data,
  etag: (res.headers.etag as string | undefined) ?? `"${res.data.data.version}"`,
});

/** Pages the site plan reads at most (100 units each); narrower filters cover larger projects. */
export const SITE_PLAN_MAX_PAGES = 20;

export const inventoryApi = {
  listUnits: (params: ListParams) => list<UnitListItem>(ep.units, params),

  /** Every unit matching `params`, up to SITE_PLAN_MAX_PAGES pages: the site plan draws whole buildings. */
  listAllUnits: async (params: ListParams) => {
    const page = (n: number) => list<UnitListItem>(ep.units, { ...params, page: n, pageSize: MAX_PAGE_SIZE });
    const first = await page(1);
    const pages = Math.min(pageCount(first.meta), SITE_PLAN_MAX_PAGES);
    const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, i) => page(i + 2)));
    const items = [first, ...rest].flatMap((p) => p.items);
    return { items, total: first.meta.total, truncated: first.meta.total > items.length };
  },

  getUnit: (id: number) => staffApi.get<Envelope<Unit>>(ep.unit(id)).then(versioned),

  updateUnit: ({ id, patch, etag }: { id: number; patch: UnitPatch; etag: string }) =>
    staffApi.patch<Envelope<Unit>>(ep.unit(id), patch, { headers: { "If-Match": etag } }).then(versioned),

  changeStatus: ({
    id,
    input,
    etag,
    idempotencyKey,
  }: {
    id: number;
    input: StatusChangeInput;
    etag: string;
    idempotencyKey: string;
  }) =>
    staffApi
      .post<Envelope<Unit>>(ep.unitStatus(id), input, {
        headers: { "If-Match": etag, ...idempotencyHeader(idempotencyKey) },
      })
      .then(versioned),

  requestPriceChange: ({ id, input, idempotencyKey }: { id: number; input: PriceChangeInput; idempotencyKey: string }) =>
    staffApi
      .post<Envelope<PriceChange>>(ep.unitPriceChanges(id), input, { headers: idempotencyHeader(idempotencyKey) })
      .then((r) => r.data.data),

  statusHistory: (id: number, page: number) => list<StatusHistoryEntry>(ep.unitStatusHistory(id), { page, pageSize: 25 }),
  priceChanges: (unitId: number, page: number) =>
    list<PriceChange>(ep.priceChanges, { page, pageSize: 25, filter: { unit_id: unitId }, sort: "-id" }),
  ownershipHistory: (id: number) => list<OwnershipRecord>(ep.unitOwnershipHistory(id), { pageSize: MAX_PAGE_SIZE }),
  eligibility: (id: number, clientId: number) =>
    staffApi
      .get<Envelope<Eligibility>>(ep.unitEligibility(id), { params: toSearchParams({ extra: { client_id: clientId } }) })
      .then((r) => r.data.data),
  availability: (id: number) => staffApi.get<Envelope<Availability>>(ep.unitAvailability(id)).then((r) => r.data.data),

  // Lookups for filters and labels: small lists, fetched once (pageSize 100).
  projects: () => list<Project>(ep.projects, { pageSize: MAX_PAGE_SIZE }).then((p) => p.items),
  buildings: () => list<Building>(ep.buildings, { pageSize: MAX_PAGE_SIZE }).then((p) => p.items),
  unitTypes: () => list<UnitType>(ep.unitTypes, { pageSize: MAX_PAGE_SIZE }).then((p) => p.items),

  unitFeatures: (id: number) => staffApi.get<Envelope<Feature[]>>(ep.unitFeatures(id)).then((r) => r.data.data),
  /** Replaces the list; one that differs from the template is recorded as an override. */
  setUnitFeatures: (id: number, featureIds: number[]) =>
    staffApi.put<Envelope<Feature[]>>(ep.unitFeatures(id), { feature_ids: featureIds }).then((r) => r.data.data),

  /** Not idempotent: callers disable the submit while it runs (DUPLICATE_UNIT_CODE on a taken code). */
  createUnitsFromTemplate: (templateId: number, body: NewTemplateUnits) =>
    staffApi
      .post<Envelope<{ unit_ids: number[] }>>(ep.unitTemplateUnits(templateId), body)
      .then((r) => r.data.data),

  exportUnits: () => downloadFile(staffApi, ep.exports("units"), "units.csv"),
};
