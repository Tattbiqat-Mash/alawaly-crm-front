"use client";

import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/shared/status-badge";
import { isPriority, isServiceRequestStatus, isServiceType, priorityTone, serviceStatusTone } from "@/config/statuses";

export function ServiceStatusBadge({ status }: { status: string }) {
  const t = useTranslations("statuses.serviceRequest");
  return isServiceRequestStatus(status) ? <StatusBadge tone={serviceStatusTone[status]}>{t(status)}</StatusBadge> : <StatusBadge>{status}</StatusBadge>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  const t = useTranslations("statuses.priority");
  return isPriority(priority) ? <StatusBadge tone={priorityTone[priority]}>{t(priority)}</StatusBadge> : <StatusBadge>{priority}</StatusBadge>;
}

export function useServiceTypeLabel() {
  const t = useTranslations("statuses.serviceType");
  return (type: string) => (isServiceType(type) ? t(type) : type);
}
