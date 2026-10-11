import { ownerEndpoints } from "@/config/endpoints";
import { OPEN_SERVICE_REQUEST_STATUSES } from "@/config/statuses";
import { ownerApi } from "@/lib/api/client";
import { unwrapList, type Envelope, type ListEnvelope } from "@/lib/api/envelope";
import { toApiError } from "@/lib/api/errors";
import { MAX_PAGE_SIZE, toSearchParams, type ListParams } from "@/lib/api/params";
import type { OwnerHandover, OwnerInstallment, OwnerNotification, OwnerSale, OwnerServiceRequest, OwnerUnit } from "./types";

const list = <T>(path: string, params: ListParams = {}) =>
  ownerApi.get<ListEnvelope<T>>(path, { params: toSearchParams(params) }).then((r) => unwrapList(r.data));

export const ownerHomeApi = {
  units: () => list<OwnerUnit>(ownerEndpoints.units, { pageSize: MAX_PAGE_SIZE }),
  sales: () => list<OwnerSale>(ownerEndpoints.sales, { pageSize: MAX_PAGE_SIZE }).then((p) => p.items),
  /** Returned without meta (see DECISIONS.md). */
  installments: (saleId: number) => list<OwnerInstallment>(ownerEndpoints.saleInstallments(saleId)).then((p) => p.items),
  openRequests: () =>
    list<OwnerServiceRequest>(ownerEndpoints.serviceRequests, {
      pageSize: MAX_PAGE_SIZE,
      filter: { status: OPEN_SERVICE_REQUEST_STATUSES },
    }),
  latestNotifications: () => list<OwnerNotification>(ownerEndpoints.notifications, { pageSize: 3 }),
  /** null when the sale has no handover yet (404). */
  handover: (saleId: number) =>
    ownerApi
      .get<Envelope<OwnerHandover>>(ownerEndpoints.saleHandover(saleId))
      .then((r) => r.data.data)
      .catch((err: unknown) => {
        if (toApiError(err).code === "NOT_FOUND") return null;
        throw err;
      }),
};
