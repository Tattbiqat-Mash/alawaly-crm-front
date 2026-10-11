import { staffEndpoints } from "@/config/endpoints";
import type { ServiceRequest } from "@/features/service/api";
import { staffApi } from "@/lib/api/client";
import { unwrapList, type Envelope, type ListEnvelope } from "@/lib/api/envelope";
import { uploadMultipart } from "@/lib/api/files";
import { idempotencyHeader } from "@/lib/api/idempotency";
import { toSearchParams, type ListParams } from "@/lib/api/params";

export const MANDATE_STATUSES = ["draft", "active", "ended", "revoked"] as const;
export const MANDATE_MODES = ["services_only", "full_management"] as const;
export const LEASE_STATUSES = ["draft", "active", "ended", "terminated"] as const;
export const RENT_STATUSES = ["pending", "paid", "overdue", "waived"] as const;
export const FREQUENCIES = ["monthly", "quarterly", "semi_annual", "annual"] as const;
export const INSPECTION_TYPES = ["move_in", "move_out", "periodic"] as const;
/** Capability names seen in the guide; others are shown as they come (MANDATE_SCOPE still applies). */
export const KNOWN_CAPABILITIES = ["service_requests", "view_statements", "manage_tenants", "manage_leases", "collect_rent", "inspections"] as const;

export type Mandate = {
  id: number;
  unit_id: number;
  owner_client_id: number;
  mode: string;
  status: string;
  valid_from: string | null;
  valid_to: string | null;
  capabilities: string[];
  has_document: boolean;
};
export type Tenant = { id: number; mandate_id: number; name: string; phone: string | null; email: string | null; nationality_note: string | null; active: 0 | 1 | boolean };
export type RentItem = { id: number; lease_id: number; due_on: string; amount: string; status: string; paid_on: string | null; reference: string | null; recorded_by: number | null };
export type Inspection = { id: number; lease_id: number; type: string; inspected_on: string; items: { room: string; condition: string }[]; notes: string | null };
export type Lease = {
  id: number;
  mandate_id: number;
  unit_id: number;
  tenant_id: number;
  start_date: string;
  end_date: string;
  rent_amount: string;
  rent_frequency: string;
  deposit: string | null;
  status: string;
  renewed_from_id: number | null;
};
export type LeaseDetail = Lease & { schedule: RentItem[]; inspections: Inspection[] };
/** Totals arrive as numbers, not decimal strings (D5). */
export type Statement = {
  id: number;
  mandate_id: number;
  period_start: string;
  period_end: string;
  totals: { expected: number | string; collected: number | string; outstanding: number | string; overdue: number | string; waived: number | string; items: number };
  generated_at: string;
};

const ep = staffEndpoints;
const list = <T>(path: string, params: ListParams) =>
  staffApi.get<ListEnvelope<T>>(path, { params: toSearchParams(params) }).then((r) => unwrapList(r.data));
const data = <T>(p: Promise<{ data: Envelope<T> }>) => p.then((r) => r.data.data);
const post = <T>(path: string, body: unknown = {}, key?: string) =>
  data(staffApi.post<Envelope<T>>(path, body, key ? { headers: idempotencyHeader(key) } : undefined));

const records = <T>(items: unknown): T[] => (Array.isArray(items) ? items.filter((x): x is T => typeof x === "object" && x !== null) : []);
/** Inspection items come back as a JSON string (recorded example); accept both forms. */
const parseItems = (items: unknown): Inspection["items"] => {
  if (Array.isArray(items)) return items;
  if (typeof items === "string") {
    try {
      const parsed: unknown = JSON.parse(items);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};
const cleanMandate = (m: Mandate): Mandate => ({ ...m, capabilities: (m.capabilities ?? []).filter((c) => !c.startsWith("…")) });

export const rentalsApi = {
  mandates: (params: ListParams) => list<Mandate>(ep.rentalMandates, params).then((p) => ({ ...p, items: p.items.map(cleanMandate) })),
  mandate: (id: number) => data(staffApi.get<Envelope<Mandate>>(ep.rentalMandate(id))).then(cleanMandate),
  /** Only the recorded current owner can give a mandate (422 NOT_OWNER). Created as a draft. */
  createMandate: (body: Record<string, unknown>, key: string) => post<Mandate>(ep.rentalMandates, body, key).then(cleanMandate),
  uploadDocument: (id: number, file: File, onProgress: (p: number) => void) => uploadMultipart<Mandate>(staffApi, ep.mandateDocument(id), { file }, { onProgress }),
  /** activate: 422 MANDATE_DOCUMENT_REQUIRED; end / revoke: 409 ACTIVE_LEASES. */
  mandateAction: (id: number, action: "activate" | "end" | "revoke") => post<Mandate>(ep.mandateAction(id, action)).then(cleanMandate),
  raiseServiceRequest: (id: number, body: { category: string; title: string }, key: string) =>
    post<ServiceRequest>(ep.mandateServiceRequests(id), body, key),

  tenants: (mandateId: number, params: ListParams) => list<Tenant>(ep.mandateTenants(mandateId), params),
  /** 403 MANDATE_SCOPE when the mandate does not allow manage_tenants. */
  saveTenant: (mandateId: number, id: number | null, body: Record<string, unknown>, key: string) =>
    id === null ? post<Tenant>(ep.mandateTenants(mandateId), body, key) : data(staffApi.patch<Envelope<Tenant>>(ep.tenant(id), body)),

  leases: (params: ListParams) => list<Lease>(ep.leases, params),
  lease: (id: number) =>
    data(staffApi.get<Envelope<LeaseDetail>>(ep.lease(id))).then((l) => ({
      ...l,
      schedule: records<RentItem>(l.schedule),
      inspections: records<Inspection>(l.inspections).map((i) => ({ ...i, items: parseItems(i.items) })),
    })),
  createLease: (mandateId: number, body: Record<string, unknown>, key: string) => post<Lease>(ep.mandateLeases(mandateId), body, key),
  /** terminate needs {reason}; renew needs {end_date} and returns the new draft lease. 409 LEASE_OVERLAP, 422 OUTSIDE_MANDATE. */
  leaseAction: (id: number, action: "activate" | "end" | "terminate" | "renew", body: Record<string, unknown> = {}) =>
    post<Lease>(ep.leaseAction(id, action), body),
  recordInspection: (id: number, body: { type: string; inspected_on: string; items: { room: string; condition: string }[]; notes?: string }, key: string) =>
    post<Inspection>(ep.leaseInspections(id), body, key),

  rentItems: (params: ListParams) => list<RentItem>(ep.rentItems, params),
  /** 409 INVALID_STATE for paid or waived items. */
  recordRent: (id: number, body: { paid_on: string; reference?: string }) => post<RentItem>(ep.rentItemAction(id, "record"), body),
  waiveRent: (id: number, reason: string) => post<RentItem>(ep.rentItemAction(id, "waive"), { reason }),

  statements: (mandateId: number) => list<Statement>(ep.mandateStatements(mandateId), { pageSize: 100, sort: "-id" }),
  /** One statement per period: generating the same period again refreshes it. */
  generateStatement: (mandateId: number, body: { period_start: string; period_end: string }) => post<Statement>(ep.mandateStatements(mandateId), body),
};
