import { staffEndpoints } from "@/config/endpoints";
import { staffApi } from "@/lib/api/client";
import { unwrapList, type Envelope, type ListEnvelope } from "@/lib/api/envelope";
import { idempotencyHeader } from "@/lib/api/idempotency";
import { toSearchParams, type ListParams } from "@/lib/api/params";

export type Role = {
  id: number;
  role_nameEn: string | null;
  role_nameAr: string | null;
  active: 0 | 1 | boolean;
  permissions: string[];
};

export type RoleInput = Partial<{ role_nameEn: string; role_nameAr: string; permissions: string[]; active: boolean }>;

export type StaffUser = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role_id: number | null;
  branch_id?: number | null;
  active: 0 | 1 | boolean;
  last_active_at?: string | null;
  created_at?: string | null;
};

export type UserInput = Partial<{ name: string; email: string; password: string; role_id: number; branch_id: number; active: boolean }>;

export type AuditEntry = {
  id: number;
  actor_type: string;
  actor_id: number | null;
  action: string;
  entity_type: string;
  entity_id: string | number;
  before: string | null;
  after: string | null;
  source: string | null;
  correlation_id: string | null;
  created_at: string | null;
};

/** Entity types the audit filter offers; the API also accepts any other value typed by the user. */
export const AUDIT_ENTITY_TYPES = ["unit", "reservation", "sale", "payment_transaction", "handover", "service_request", "rental_mandate", "lease", "role", "user"] as const;

/** Real permission names only: recorded examples append a "… N items" note to shortened lists. */
const realNames = (list: unknown) => (Array.isArray(list) ? list.filter((p): p is string => typeof p === "string" && !p.startsWith("…")) : []);
const normalizeRole = (r: Role): Role => ({ ...r, permissions: realNames(r.permissions) });

/** before/after are JSON strings; anything unparsable is shown raw. */
export function parseAuditJson(value: string | null): Record<string, unknown> | string | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : value;
  } catch {
    return value;
  }
}

const ep = staffEndpoints;

export const adminApi = {
  permissions: () => staffApi.get<Envelope<string[]>>(ep.permissions).then((r) => realNames(r.data.data)),
  roles: (params: ListParams) =>
    staffApi.get<ListEnvelope<Role>>(ep.roles, { params: toSearchParams(params) }).then((r) => {
      const page = unwrapList(r.data);
      return { ...page, items: page.items.map(normalizeRole) };
    }),
  createRole: (body: RoleInput, key: string) =>
    staffApi.post<Envelope<Role>>(ep.roles, body, { headers: idempotencyHeader(key) }).then((r) => normalizeRole(r.data.data)),
  updateRole: (id: number, body: RoleInput) => staffApi.patch<Envelope<Role>>(ep.role(id), body).then((r) => normalizeRole(r.data.data)),

  users: (params: ListParams) => staffApi.get<ListEnvelope<StaffUser>>(ep.users, { params: toSearchParams(params) }).then((r) => unwrapList(r.data)),
  createUser: (body: UserInput, key: string) => staffApi.post<Envelope<StaffUser>>(ep.users, body, { headers: idempotencyHeader(key) }).then((r) => r.data.data),
  updateUser: (id: number, body: UserInput) => staffApi.patch<Envelope<StaffUser>>(ep.user(id), body).then((r) => r.data.data),

  audit: (params: ListParams) => staffApi.get<ListEnvelope<AuditEntry>>(ep.auditLogs, { params: toSearchParams(params) }).then((r) => unwrapList(r.data)),
};
