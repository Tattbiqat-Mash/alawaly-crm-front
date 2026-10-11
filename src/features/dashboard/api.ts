import { staffEndpoints } from "@/config/endpoints";
import { staffApi } from "@/lib/api/client";
import type { Envelope, ListEnvelope } from "@/lib/api/envelope";
import { toSearchParams } from "@/lib/api/params";
import type { FacilitiesSummary, IntegrationHealth, InventorySummary, SalesSummary, ServiceWorkload } from "./types";

const get = <T>(path: string) => staffApi.get<Envelope<T>>(path).then((r) => r.data.data);
const { reports } = staffEndpoints;

export const dashboardApi = {
  inventorySummary: () => get<InventorySummary>(reports.inventorySummary),
  salesSummary: () => get<SalesSummary>(reports.salesSummary),
  serviceWorkload: () => get<ServiceWorkload>(reports.serviceWorkload),
  facilitiesSummary: () => get<FacilitiesSummary>(reports.facilitiesSummary),
  integrationHealth: () => get<IntegrationHealth>(reports.integrations),
  /** Count only: one row is enough, meta.total carries the number. */
  pendingSecondApprovals: () =>
    staffApi
      .get<ListEnvelope<unknown>>(staffEndpoints.paymentTransactions, {
        params: toSearchParams({ pageSize: 1, filter: { status: "pending_second_approval" } }),
      })
      .then((r) => r.data.meta?.total ?? r.data.data.length),
};
