import { staffEndpoints } from "@/config/endpoints";
import { staffApi } from "@/lib/api/client";
import { unwrapList, type Envelope, type ListEnvelope } from "@/lib/api/envelope";
import { toSearchParams, type ListParams } from "@/lib/api/params";

export const SEVERITIES = ["minor", "major", "critical"] as const;
export type Severity = (typeof SEVERITIES)[number];

export type Snag = {
  id: number;
  handover_id: number;
  area: string;
  description: string;
  severity: string;
  /** open → fixed | waived */
  status: string;
  resolved_at: string | null;
};

export type Handover = {
  id: number;
  sale_id: number;
  status: string;
  scheduled_at: string | null;
  inspected_at: string | null;
  accepted_at: string | null;
  accepted_by_client_id: number | null;
  inspected_by: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items?: Snag[];
};

export type SnagInput = { area: string; description: string; severity: Severity };

const ep = staffEndpoints;
const data = <T>(p: Promise<{ data: Envelope<T> }>) => p.then((r) => r.data.data);

// Staff can schedule, inspect, record snags and close. Acceptance happens only in the owner portal.
export const handoverApi = {
  list: (params: ListParams) =>
    staffApi.get<ListEnvelope<Handover>>(ep.handovers, { params: toSearchParams(params) }).then((r) => unwrapList(r.data)),
  get: (id: number) => data(staffApi.get<Envelope<Handover>>(ep.handover(id))),
  reschedule: (id: number, scheduled_at: string) => data(staffApi.patch<Envelope<Handover>>(ep.handover(id), { scheduled_at })),
  inspect: (id: number, body: { items: SnagInput[]; notes?: string }) => data(staffApi.post<Envelope<Handover>>(ep.inspectHandover(id), body)),
  addSnag: (id: number, body: SnagInput) => data(staffApi.post<Envelope<Snag>>(ep.handoverItems(id), body)),
  updateSnag: (snagId: number, status: "fixed" | "waived") => data(staffApi.patch<Envelope<Snag>>(ep.handoverItem(snagId), { status })),
  /** 422 OPEN_SNAGS while any snag is open. */
  close: (id: number) => data(staffApi.post<Envelope<Handover>>(ep.closeHandover(id))),
};
