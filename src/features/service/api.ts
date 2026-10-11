import { staffEndpoints } from "@/config/endpoints";
import type { ServiceAction } from "@/config/statuses";
import { staffApi } from "@/lib/api/client";
import { unwrapList, type Envelope, type ListEnvelope } from "@/lib/api/envelope";
import { toSearchParams, type ListParams } from "@/lib/api/params";

export type ServiceRequest = {
  id: number;
  unit_id: number;
  client_id: number | null;
  ownership_id: number | null;
  sale_id: number | null;
  category: string;
  type: string;
  priority: string;
  title: string;
  description: string | null;
  status: string;
  sla_due_at: string | null;
  team_id: number | null;
  technician_id: number | null;
  contractor_id: number | null;
  warranty_id: number | null;
  decided_by: number | null;
  reject_reason: string | null;
  rating: number | null;
  feedback: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ServiceEvent = {
  id: number;
  event: string;
  from_status: string | null;
  to_status: string | null;
  actor_type: string | null;
  actor_id: number | null;
  note: string | null;
  created_at: string;
};

/** Visit fields beyond id / status / scheduled_at are not recorded in the guide; read defensively. */
export type Visit = {
  id: number;
  status?: string | null;
  scheduled_at?: string | null;
  technician_id?: number | null;
  contractor_id?: number | null;
  notes?: string | null;
};

export type ServiceAttachment = { id: number; original_name: string; mime: string; size: number; created_at: string };
export type Material = { id: number; visit_id: number; name: string; quantity: string; unit_cost: string };

export type ServiceRequestDetail = ServiceRequest & { events?: ServiceEvent[]; visits?: Visit[]; attachments?: ServiceAttachment[] };

/** Bodies per action (guide): reject {reason}, assign {technician_id | contractor_id, team_id?}, schedule {scheduled_at}, complete {notes?}. */
export type ActionBody = Partial<{ reason: string; technician_id: number; contractor_id: number; team_id: number; scheduled_at: string; notes: string }>;

const ep = staffEndpoints;
const data = <T>(p: Promise<{ data: Envelope<T> }>) => p.then((r) => r.data.data);

export const serviceApi = {
  list: (params: ListParams) =>
    staffApi.get<ListEnvelope<ServiceRequest>>(ep.serviceRequests, { params: toSearchParams(params) }).then((r) => unwrapList(r.data)),
  get: (id: number) => data(staffApi.get<Envelope<ServiceRequestDetail>>(ep.serviceRequest(id))),
  /** 422 INVALID_TRANSITION (details.allowed) when the state does not allow the action. */
  act: (id: number, action: ServiceAction, body: ActionBody = {}) =>
    data(staffApi.post<Envelope<ServiceRequest>>(ep.serviceRequestAction(id, action), body)),
  attachmentLink: (attId: number) => staffApi.get<Envelope<{ url: string; expires_in: number }>>(ep.serviceAttachmentLink(attId)).then((r) => r.data),
  materials: (visitId: number) => data(staffApi.get<Envelope<Material[]>>(ep.visitMaterials(visitId))),
  addMaterial: (visitId: number, body: { name: string; quantity: string; unit_cost: string }) =>
    data(staffApi.post<Envelope<Material>>(ep.visitMaterials(visitId), body)),
  /** 409 INVALID_STATE once the visit is done. */
  rescheduleVisit: (visitId: number, scheduled_at: string) => data(staffApi.patch<Envelope<Visit>>(ep.visit(visitId), { scheduled_at })),
};
