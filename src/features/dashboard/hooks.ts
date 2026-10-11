"use client";

import { useQuery } from "@tanstack/react-query";
import type { Permission } from "@/config/permissions";
import { usePermissions } from "@/features/auth/hooks";
import { dashboardApi } from "./api";

/** Each widget is its own query behind its own permission, so one failure never blanks the page. */
function useWidget<T>(key: string, permission: Permission, fn: () => Promise<T>) {
  const { can, ready } = usePermissions();
  const allowed = ready && can(permission);
  const query = useQuery({
    queryKey: ["dashboard", key],
    queryFn: fn,
    enabled: allowed,
    refetchOnWindowFocus: true, // no push channel: refresh when the user comes back
  });
  return { ...query, allowed };
}

export const useInventorySummary = () => useWidget("inventory", "reports.view", dashboardApi.inventorySummary);
export const useSalesSummary = () => useWidget("sales", "reports.view", dashboardApi.salesSummary);
export const useServiceWorkload = () => useWidget("service", "maint.manage", dashboardApi.serviceWorkload);
export const useFacilitiesSummary = () => useWidget("facilities", "facility.manage", dashboardApi.facilitiesSummary);
export const useIntegrationHealth = () => useWidget("integrations", "integrations.manage", dashboardApi.integrationHealth);
export const usePendingSecondApprovals = () =>
  useWidget("second-approvals", "finance.view", dashboardApi.pendingSecondApprovals);
