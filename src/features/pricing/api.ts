import { staffEndpoints } from "@/config/endpoints";
import type { PriceChange } from "@/features/inventory/types";
import { staffApi } from "@/lib/api/client";
import { unwrapList, type Envelope, type ListEnvelope } from "@/lib/api/envelope";
import { toSearchParams, type ListParams } from "@/lib/api/params";

export const pricingApi = {
  list: (params: ListParams) =>
    staffApi
      .get<ListEnvelope<PriceChange>>(staffEndpoints.priceChanges, { params: toSearchParams(params) })
      .then((r) => unwrapList(r.data)),
  /** The approver must be a different person than the requester (FOUR_EYES_REQUIRED). */
  approve: (id: number) =>
    staffApi.post<Envelope<PriceChange>>(staffEndpoints.approvePriceChange(id)).then((r) => r.data.data),
  reject: (id: number) => staffApi.post<Envelope<PriceChange>>(staffEndpoints.rejectPriceChange(id)).then((r) => r.data.data),
};
