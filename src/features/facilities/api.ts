import { staffEndpoints } from "@/config/endpoints";
import { staffApi } from "@/lib/api/client";
import { unwrapList, type Envelope, type ListEnvelope } from "@/lib/api/envelope";
import { idempotencyHeader } from "@/lib/api/idempotency";
import { toSearchParams, type ListParams } from "@/lib/api/params";

type Flag = 0 | 1 | boolean;

export type Facility = { id: number; project_id: number | null; building_id: number | null; name_ar: string | null; name_en: string | null; type: string | null; active: Flag };
export type Asset = { id: number; facility_id: number; name: string; category: string | null; serial_no: string | null; installed_on: string | null; status: string };
export type PmSchedule = { id: number; asset_id: number; title: string; frequency_days: number; next_due_on: string | null; team_id: number | null; active: Flag };
export type PmTask = {
  id: number;
  pm_schedule_id: number;
  asset_id: number;
  due_on: string;
  status: string;
  completed_at: string | null;
  completed_by: number | null;
  notes: string | null;
};
export type Incident = {
  id: number;
  facility_id: number;
  asset_id: number | null;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  reported_by_type: string | null;
  reported_by_id: number | null;
  resolved_at: string | null;
  resolution: string | null;
  created_at: string;
};
export type AssetHistory = { tasks: PmTask[]; incidents: Incident[] };

export const ASSET_STATUSES = ["in_service", "out_of_service", "retired"] as const;
export const TASK_STATUSES = ["open", "in_progress", "done", "skipped"] as const;
export const INCIDENT_STATUSES = ["open", "investigating", "resolved", "closed"] as const;

const ep = staffEndpoints;
const list = <T>(path: string, params: ListParams) =>
  staffApi.get<ListEnvelope<T>>(path, { params: toSearchParams(params) }).then((r) => unwrapList(r.data));
const data = <T>(p: Promise<{ data: Envelope<T> }>) => p.then((r) => r.data.data);
const post = <T>(path: string, body: unknown, key?: string) =>
  data(staffApi.post<Envelope<T>>(path, body, key ? { headers: idempotencyHeader(key) } : undefined));
/** Recorded lists can carry a placeholder string; keep only records. */
const records = <T>(items: unknown): T[] => (Array.isArray(items) ? items.filter((x): x is T => typeof x === "object" && x !== null) : []);

export const facilitiesApi = {
  facilities: (params: ListParams) => list<Facility>(ep.facilities, params),
  saveFacility: (id: number | null, body: Record<string, unknown>, key: string) =>
    id === null ? post<Facility>(ep.facilities, body, key) : data(staffApi.patch<Envelope<Facility>>(ep.facility(id), body)),

  assets: (params: ListParams) => list<Asset>(ep.assets, params),
  saveAsset: (id: number | null, body: Record<string, unknown>, key: string) =>
    id === null ? post<Asset>(ep.assets, body, key) : data(staffApi.patch<Envelope<Asset>>(ep.asset(id), body)),
  assetHistory: (id: number) =>
    data(staffApi.get<Envelope<AssetHistory>>(ep.assetHistory(id))).then((h) => ({ tasks: records<PmTask>(h.tasks), incidents: records<Incident>(h.incidents) })),

  schedules: (params: ListParams) => list<PmSchedule>(ep.pmSchedules, params),
  saveSchedule: (id: number | null, body: Record<string, unknown>, key: string) =>
    id === null ? post<PmSchedule>(ep.pmSchedules, body, key) : data(staffApi.patch<Envelope<PmSchedule>>(ep.pmSchedule(id), body)),
  /** Tasks come from schedules only; the UI never creates them. `overdue=1` is a plain parameter. */
  tasks: (params: ListParams) => list<PmTask>(ep.pmTasks, params),
  taskAction: (id: number, action: "start" | "complete" | "skip", notes?: string) =>
    post<PmTask>(ep.pmTaskAction(id, action), notes ? { notes } : {}),

  incidents: (params: ListParams) => list<Incident>(ep.incidents, params),
  /** 422 when the asset is not in the chosen facility. */
  reportIncident: (body: Record<string, unknown>, key: string) => post<Incident>(ep.incidents, body, key),
  incidentAction: (id: number, action: "investigate" | "resolve" | "close", resolution?: string) =>
    post<Incident>(ep.incidentAction(id, action), resolution ? { resolution } : {}),
};
