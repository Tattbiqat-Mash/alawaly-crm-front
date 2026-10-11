import type { AxiosResponse } from "axios";
import { staffEndpoints } from "@/config/endpoints";
import { staffApi } from "@/lib/api/client";
import { unwrapList, type Envelope, type ListEnvelope } from "@/lib/api/envelope";
import { downloadFile } from "@/lib/api/files";
import { idempotencyHeader } from "@/lib/api/idempotency";
import { MAX_PAGE_SIZE, toSearchParams, type ListParams } from "@/lib/api/params";
import type {
  Availability,
  DuplicateGroup,
  Building,
  Eligibility,
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

const list = <T>(path: string, params: ListParams = {}) =>
  staffApi.get<ListEnvelope<T>>(path, { params: toSearchParams(params) }).then((r) => unwrapList(r.data));

/** ETag is the unit's version ("3"); fall back to it if a proxy drops the header. */
const versioned = (res: AxiosResponse<Envelope<Unit>>): VersionedUnit => ({
  unit: res.data.data,
  etag: (res.headers.etag as string | undefined) ?? `"${res.data.data.version}"`,
});

export const inventoryApi = {
  listUnits: (params: ListParams) => list<UnitListItem>(ep.units, params),

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

  /** One page of 100 groups covers the report; KPIs use meta.total. */
  duplicates: () => list<DuplicateGroup>(ep.unitsDuplicates, { pageSize: MAX_PAGE_SIZE }),

  exportUnits: () => downloadFile(staffApi, ep.exports("units"), "units.csv"),
};
