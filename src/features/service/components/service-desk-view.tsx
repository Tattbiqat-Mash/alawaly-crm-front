"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import { DataTable, type Column } from "@/components/shared/data-table/data-table";
import { paginationProps } from "@/components/shared/data-table/list-params";
import { FilterBar, FilterSelect, ResetFilters, SearchFilter } from "@/components/shared/filters";
import { EmptyState } from "@/components/shared/states";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PRIORITIES, SERVICE_REQUEST_STATUSES, SERVICE_TYPES } from "@/config/statuses";
import { usePermissions } from "@/features/auth/hooks";
import { useServiceWorkload } from "@/features/dashboard/hooks";
import { useAllResources } from "@/features/maintenance/hooks";
import { useNow } from "@/hooks/use-now";
import { useRouter } from "@/i18n/navigation";
import { formatDateTime, formatRelative, serverTimeToEpoch } from "@/lib/format/dates";
import { formatCount, formatDecimal } from "@/lib/format/money";
import type { ServiceRequest } from "../api";
import { useServiceDeskState, useServiceRequests } from "../hooks";
import { PriorityBadge, ServiceStatusBadge, useServiceTypeLabel } from "./service-badges";

const SORTS = { priority: "-priority", sla: "sla_due_at", newest: "-id" } as const;
const CLOSED = ["completed", "closed", "rejected"];

/** KPI strip from /reports/service-workload — needs maint.manage, hidden otherwise (D9). */
function Kpis() {
  const t = useTranslations("serviceDesk.kpi");
  const locale = useLocale();
  const workload = useServiceWorkload();
  if (!workload.allowed || workload.error) return null;
  const d = workload.data;
  const items = [
    [t("open"), formatCount(d?.open_requests, locale)],
    [t("slaBreached"), formatCount(d?.sla_breached, locale)],
    [t("rating"), d?.average_rating == null ? "—" : formatDecimal(d.average_rating, locale, 1)],
  ] as const;
  return (
    <dl className="grid grid-cols-3 gap-3">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-xl border bg-card p-3">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="num mt-1 text-xl font-semibold">{workload.isLoading ? <Skeleton className="h-6 w-12" /> : value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Sla({ request }: { request: ServiceRequest }) {
  const t = useTranslations("serviceDesk");
  const locale = useLocale();
  const now = useNow();
  if (!request.sla_due_at) return <span className="text-xs text-muted-foreground">{t("slaNotSet")}</span>;
  const overdue = !CLOSED.includes(request.status) && (serverTimeToEpoch(request.sla_due_at) ?? 0) < now;
  return (
    <div className="flex flex-col">
      <span className="num">{formatDateTime(request.sla_due_at, locale)}</span>
      <span className={overdue ? "text-xs font-medium text-destructive" : "text-xs text-muted-foreground"}>
        {overdue ? t("overdue") : formatRelative(request.sla_due_at, locale, now)}
      </span>
    </div>
  );
}

// S24 — Service desk.
export function ServiceDeskView() {
  const t = useTranslations();
  const router = useRouter();
  const typeLabel = useServiceTypeLabel();
  const { can } = usePermissions();
  const [state, setState] = useServiceDeskState();
  const list = useServiceRequests(state);
  const technicians = useAllResources("technicians");
  const set = (patch: Partial<typeof state>) => setState({ ...patch, page: 1 });

  const technicianName = useMemo(() => {
    const map = new Map((technicians.data ?? []).map((x) => [x.id, x.name]));
    return (r: ServiceRequest) =>
      r.technician_id ? (map.get(r.technician_id) ?? `#${r.technician_id}`) : r.contractor_id ? `#${r.contractor_id}` : t("serviceDesk.unassigned");
  }, [technicians.data, t]);

  const sortKey = (Object.entries(SORTS).find(([, v]) => v === state.sort)?.[0] ?? "priority") as keyof typeof SORTS;

  const columns: Column<ServiceRequest>[] = [
    { id: "id", header: t("serviceDesk.columns.id"), cell: (r) => <span className="num font-medium">{r.id}</span> },
    { id: "title", header: t("serviceDesk.columns.title"), className: "max-w-72 truncate", cell: (r) => <span dir="auto" title={r.title}>{r.title}</span> },
    { id: "unit", header: t("serviceDesk.columns.unit"), cell: (r) => <span className="num">{t("common.unitRef", { id: r.unit_id })}</span> },
    { id: "type", header: t("serviceDesk.columns.type"), cell: (r) => typeLabel(r.type) },
    { id: "priority", header: t("serviceDesk.columns.priority"), cell: (r) => <PriorityBadge priority={r.priority} /> },
    { id: "status", header: t("serviceDesk.columns.status"), cell: (r) => <ServiceStatusBadge status={r.status} /> },
    { id: "sla", header: t("serviceDesk.columns.sla"), cell: (r) => <Sla request={r} /> },
    { id: "assigned", header: t("serviceDesk.columns.assigned"), cell: (r) => technicianName(r) },
  ];

  const active = [state.status, state.type, state.priority, state.technician, state.unit].filter(Boolean).length;

  return (
    <>
      <Kpis />
      <FilterBar>
        <FilterSelect
          label={t("serviceDesk.filters.status")}
          value={state.status}
          onChange={(v) => set({ status: v })}
          options={SERVICE_REQUEST_STATUSES.map((s) => ({ value: s, label: t(`statuses.serviceRequest.${s}`) }))}
        />
        <FilterSelect
          label={t("serviceDesk.filters.type")}
          value={state.type}
          onChange={(v) => set({ type: v })}
          options={SERVICE_TYPES.map((s) => ({ value: s, label: typeLabel(s) }))}
        />
        <FilterSelect
          label={t("serviceDesk.filters.priority")}
          value={state.priority}
          onChange={(v) => set({ priority: v })}
          options={PRIORITIES.map((p) => ({ value: p, label: t(`statuses.priority.${p}`) }))}
        />
        {can("maint.manage") && (
          <FilterSelect
            label={t("serviceDesk.filters.technician")}
            value={state.technician}
            onChange={(v) => set({ technician: v })}
            options={(technicians.data ?? []).map((x) => ({ value: String(x.id), label: x.name }))}
          />
        )}
        <SearchFilter value={state.unit} onChange={(v) => set({ unit: v })} placeholder={t("serviceDesk.filters.unit")} inputMode="numeric" className="sm:w-40" />
        <Select value={sortKey} onValueChange={(v) => set({ sort: SORTS[v as keyof typeof SORTS] })}>
          <SelectTrigger aria-label={t("table.sortBy", { column: "" })} className="h-9 min-w-36 bg-background shadow-2xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SORTS) as (keyof typeof SORTS)[]).map((k) => (
              <SelectItem key={k} value={k}>
                {t(`serviceDesk.sort.${k}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ResetFilters
          count={active}
          onReset={() => setState({ status: null, type: null, priority: null, technician: null, unit: null, page: 1 })}
        />
      </FilterBar>
      <DataTable
        caption={t("serviceDesk.title")}
        columns={columns}
        rows={list.data?.items}
        getRowId={(r) => r.id}
        getRowLabel={(r) => t("serviceRequest.title", { id: r.id })}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        error={list.error}
        onRetry={() => list.refetch()}
        onRowClick={(r) => router.push(`/service-requests/${r.id}`)}
        pagination={paginationProps(list.data?.meta, setState)}
        empty={<EmptyState compact title={t("serviceDesk.empty")} />}
      />
    </>
  );
}
