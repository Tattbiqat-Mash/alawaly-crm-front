"use client";

import { Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/shared/data-table/data-table";
import { paginationProps } from "@/components/shared/data-table/list-params";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActiveBadge } from "@/features/catalog/components/active-badge";
import { useServiceWorkload } from "@/features/dashboard/hooks";
import { formatCount } from "@/lib/format/money";
import { localizedName } from "@/lib/format/localized";
import { RESOURCES, type Contractor, type Resource, type Team, type Technician } from "../api";
import { useAllResources, useMaintenanceState, useResourceList } from "../hooks";
import { ResourceFormSheet } from "./resource-form-sheet";

const TABS = [...RESOURCES, "workload"] as const;
type Tab = (typeof TABS)[number];
const isResource = (tab: string): tab is Resource => (RESOURCES as readonly string[]).includes(tab);

/** Open visits per technician (GET /reports/service-workload). */
function Workload() {
  const t = useTranslations("maintenance");
  const locale = useLocale();
  const workload = useServiceWorkload();
  if (workload.isLoading) return <Skeleton className="h-48 w-full" />;
  if (workload.error) return <ErrorState compact error={workload.error} onRetry={() => workload.refetch()} />;
  const rows = workload.data?.technicians ?? [];
  if (rows.length === 0) return <EmptyState compact title={t("workloadEmpty")} />;
  const max = Math.max(1, ...rows.map((r) => r.open_visits));
  return (
    <ul className="grid max-w-2xl gap-3 rounded-xl border bg-card p-4">
      {rows.map((r) => (
        <li key={r.id}>
          <div className="flex justify-between text-sm">
            <span>{r.name}</span>
            <span className="num text-muted-foreground">{formatCount(r.open_visits, locale)}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div className="h-full rounded-full bg-primary" style={{ width: `${(r.open_visits / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

// S26 — Teams, technicians and contractors (one table and one form for the three kinds).
export function MaintenanceView() {
  const t = useTranslations();
  const locale = useLocale();
  const [state, setState] = useMaintenanceState();
  const tab = (TABS as readonly string[]).includes(state.tab) ? (state.tab as Tab) : "technicians";
  const technicians = useResourceList("technicians", state, tab === "technicians");
  const teamsList = useResourceList("teams", state, tab === "teams");
  const contractors = useResourceList("contractors", state, tab === "contractors");
  const allTeams = useAllResources("teams");
  const [sheet, setSheet] = useState<{ resource: Resource; record?: Team | Technician | Contractor } | null>(null);

  const teamName = useMemo(() => {
    const map = new Map((allTeams.data ?? []).map((team) => [team.id, team]));
    return (id: number | null) => (id === null ? t("maintenance.noTeam") : localizedName(map.get(id), locale) || `#${id}`);
  }, [allTeams.data, locale, t]);

  const technicianColumns: Column<Technician>[] = [
    { id: "name", header: t("maintenance.columns.name"), cell: (x) => <span className="font-medium">{x.name}</span> },
    { id: "team", header: t("maintenance.columns.team"), cell: (x) => teamName(x.team_id) },
    { id: "specialty", header: t("maintenance.columns.specialty"), cell: (x) => x.specialty ?? "—" },
    { id: "phone", header: t("maintenance.columns.phone"), cell: (x) => <span dir="ltr">{x.phone ?? "—"}</span> },
    { id: "active", header: t("maintenance.columns.active"), cell: (x) => <ActiveBadge value={x.active} /> },
  ];
  const teamColumns: Column<Team>[] = [
    { id: "name", header: t("maintenance.columns.name"), cell: (x) => <span className="font-medium">{localizedName(x, locale) || `#${x.id}`}</span> },
    { id: "active", header: t("maintenance.columns.active"), cell: (x) => <ActiveBadge value={x.active} /> },
  ];
  const contractorColumns: Column<Contractor>[] = [
    { id: "name", header: t("maintenance.columns.name"), cell: (x) => <span className="font-medium">{x.name}</span> },
    { id: "contact", header: t("maintenance.columns.contact"), cell: (x) => x.contact_name ?? "—" },
    { id: "specialty", header: t("maintenance.columns.specialty"), cell: (x) => x.specialty ?? "—" },
    { id: "phone", header: t("maintenance.columns.phone"), cell: (x) => <span dir="ltr">{x.phone ?? "—"}</span> },
    { id: "email", header: t("maintenance.columns.email"), cell: (x) => <span dir="ltr">{x.email ?? "—"}</span> },
    { id: "active", header: t("maintenance.columns.active"), cell: (x) => <ActiveBadge value={x.active} /> },
  ];

  const empty = <EmptyState compact title={t("maintenance.empty")} />;

  return (
    <Tabs value={tab} onValueChange={(v) => setState({ tab: v, page: 1 })} className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TabsList>
          {TABS.map((k) => (
            <TabsTrigger key={k} value={k}>
              {t(`maintenance.tabs.${k}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        {isResource(tab) && (
          <Button onClick={() => setSheet({ resource: tab })}>
            <Plus data-icon="inline-start" />
            {t(`maintenance.add.${tab}`)}
          </Button>
        )}
      </div>
      <TabsContent value="technicians" className="flex min-h-0 flex-1 flex-col">
        <DataTable
          caption={t("maintenance.tabs.technicians")}
          columns={technicianColumns}
          rows={technicians.data?.items}
          getRowId={(x) => x.id}
          getRowLabel={(x) => x.name}
          isLoading={technicians.isLoading}
          isFetching={technicians.isFetching}
          error={technicians.error}
          onRetry={() => technicians.refetch()}
          onRowClick={(record) => setSheet({ resource: "technicians", record })}
          pagination={paginationProps(technicians.data?.meta, setState)}
          empty={empty}
        />
      </TabsContent>
      <TabsContent value="teams" className="flex min-h-0 flex-1 flex-col">
        <DataTable
          caption={t("maintenance.tabs.teams")}
          columns={teamColumns}
          rows={teamsList.data?.items}
          getRowId={(x) => x.id}
          getRowLabel={(x) => localizedName(x, locale) || `#${x.id}`}
          isLoading={teamsList.isLoading}
          isFetching={teamsList.isFetching}
          error={teamsList.error}
          onRetry={() => teamsList.refetch()}
          onRowClick={(record) => setSheet({ resource: "teams", record })}
          pagination={paginationProps(teamsList.data?.meta, setState)}
          empty={empty}
        />
      </TabsContent>
      <TabsContent value="contractors" className="flex min-h-0 flex-1 flex-col">
        <DataTable
          caption={t("maintenance.tabs.contractors")}
          columns={contractorColumns}
          rows={contractors.data?.items}
          getRowId={(x) => x.id}
          getRowLabel={(x) => x.name}
          isLoading={contractors.isLoading}
          isFetching={contractors.isFetching}
          error={contractors.error}
          onRetry={() => contractors.refetch()}
          onRowClick={(record) => setSheet({ resource: "contractors", record })}
          pagination={paginationProps(contractors.data?.meta, setState)}
          empty={empty}
        />
      </TabsContent>
      <TabsContent value="workload">
        <Workload />
      </TabsContent>
      {sheet && (
        <ResourceFormSheet
          key={`${sheet.resource}-${sheet.record?.id ?? "new"}`}
          resource={sheet.resource}
          record={sheet.record}
          onClose={() => setSheet(null)}
        />
      )}
    </Tabs>
  );
}
