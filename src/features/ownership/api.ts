import { staffEndpoints } from "@/config/endpoints";
import type { OwnershipRecord } from "@/features/inventory/types";
import { staffApi } from "@/lib/api/client";
import { unwrapList, type Envelope, type ListEnvelope } from "@/lib/api/envelope";
import { idempotencyHeader } from "@/lib/api/idempotency";
import { toSearchParams, type ListParams } from "@/lib/api/params";

export const ownershipApi = {
  list: (params: ListParams) =>
    staffApi.get<ListEnvelope<OwnershipRecord>>(staffEndpoints.ownerships, { params: toSearchParams(params) }).then((r) => unwrapList(r.data)),
  /** Resale: ends the current owner's record and starts the new one. 409 NO_CURRENT_OWNER, 422 SAME_OWNER. */
  transfer: (unitId: number, body: { to_client_id: number; note: string }, key: string) =>
    staffApi
      .post<Envelope<OwnershipRecord>>(staffEndpoints.transferOwnership(unitId), body, { headers: idempotencyHeader(key) })
      .then((r) => r.data.data),
};
