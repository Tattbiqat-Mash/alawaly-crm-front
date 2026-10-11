import { staffEndpoints } from "@/config/endpoints";
import { staffApi } from "@/lib/api/client";
import { unwrapList, type Envelope, type ListEnvelope } from "@/lib/api/envelope";
import { idempotencyHeader } from "@/lib/api/idempotency";
import { toSearchParams, type ListParams } from "@/lib/api/params";

type Flag = 0 | 1 | boolean;

export type Team = { id: number; name_ar: string | null; name_en: string | null; active: Flag };
export type Technician = { id: number; user_id: number | null; team_id: number | null; name: string; phone: string | null; specialty: string | null; active: Flag };
export type Contractor = {
  id: number;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  specialty: string | null;
  active: Flag;
  notes: string | null;
};

export type ResourceMap = { teams: Team; technicians: Technician; contractors: Contractor };
export type Resource = keyof ResourceMap;
export const RESOURCES = ["technicians", "teams", "contractors"] as const satisfies readonly Resource[];

const ep = staffEndpoints;

export const maintenanceApi = {
  list: <R extends Resource>(resource: R, params: ListParams) =>
    staffApi
      .get<ListEnvelope<ResourceMap[R]>>(ep.maintenance(resource), { params: toSearchParams(params) })
      .then((r) => unwrapList(r.data)),
  create: <R extends Resource>(resource: R, body: Record<string, unknown>, key: string) =>
    staffApi.post<Envelope<ResourceMap[R]>>(ep.maintenance(resource), body, { headers: idempotencyHeader(key) }).then((r) => r.data.data),
  /** Also used to deactivate (active: false): history is kept, assignment stops. */
  update: <R extends Resource>(resource: R, id: number, body: Record<string, unknown>) =>
    staffApi.patch<Envelope<ResourceMap[R]>>(ep.maintenanceItem(resource, id), body).then((r) => r.data.data),
};
