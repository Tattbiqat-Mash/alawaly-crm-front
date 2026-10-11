import { staffEndpoints } from "@/config/endpoints";
import type { Warranty, WarrantyPolicy } from "@/features/sales/types";
import { staffApi } from "@/lib/api/client";
import { unwrapList, type Envelope, type ListEnvelope } from "@/lib/api/envelope";
import { idempotencyHeader } from "@/lib/api/idempotency";
import { toSearchParams, type ListParams } from "@/lib/api/params";

export const WARRANTY_CATEGORIES = ["structural", "finishing", "plumbing", "electrical", "hvac", "appliances", "other"] as const;

export type PolicyInput = Partial<{
  category: string;
  name_ar: string;
  name_en: string;
  /** Only on create: the duration of an existing policy cannot change. */
  months: number;
  /** true / false, or null = undecided. */
  transferable: boolean | null;
  terms_ar: string | null;
  terms_en: string | null;
  active: boolean;
}>;

const ep = staffEndpoints;
const list = <T>(path: string, params: ListParams) =>
  staffApi.get<ListEnvelope<T>>(path, { params: toSearchParams(params) }).then((r) => unwrapList(r.data));

export const warrantyApi = {
  policies: (params: ListParams) => list<WarrantyPolicy>(ep.warrantyPolicies, params),
  createPolicy: (body: PolicyInput, key: string) =>
    staffApi.post<Envelope<WarrantyPolicy>>(ep.warrantyPolicies, body, { headers: idempotencyHeader(key) }).then((r) => r.data.data),
  updatePolicy: (id: number, body: PolicyInput) => staffApi.patch<Envelope<WarrantyPolicy>>(ep.warrantyPolicy(id), body).then((r) => r.data.data),
  warranties: (params: ListParams) => list<Warranty>(ep.warranties, params),
};
