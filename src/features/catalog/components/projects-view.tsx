"use client";

import { Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/shared/data-table/data-table";
import { paginationProps } from "@/components/shared/data-table/list-params";
import { FilterBar, FilterSelect, ResetFilters } from "@/components/shared/filters";
import { EmptyState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/features/auth/hooks";
import type { Project } from "@/features/inventory/types";
import { formatDate } from "@/lib/format/dates";
import { localizedName } from "@/lib/format/localized";
import { useProjectsList, useProjectsState } from "../hooks";
import { ActiveBadge } from "./active-badge";
import { AVAILABILITY_VALUES, ProjectFormSheet } from "./project-form-sheet";

/** Sheet target: null = closed, "new" = create, number = edit that project. */
type SheetTarget = null | "new" | number;

// S08 — Projects.
export function ProjectsView() {
  const t = useTranslations();
  const locale = useLocale();
  const { can } = usePermissions();
  const canEdit = can("inventory.edit");
  const [state, setState] = useProjectsState();
  const list = useProjectsList(state);
  const [sheet, setSheet] = useState<SheetTarget>(null);
  const set = (patch: Partial<typeof state>) => setState({ ...patch, page: 1 });

  // The API documents no status list; offer the values present in the data (plus "ongoing").
  const statuses = useMemo(
    () => Array.from(new Set(["ongoing", ...(list.data?.items ?? []).map((p) => p.status).filter((s): s is string => Boolean(s))])),
    [list.data],
  );
  const availabilityLabel = (a: string | null) =>
    a && (AVAILABILITY_VALUES as readonly string[]).includes(a) ? t(`statuses.availability.${a as (typeof AVAILABILITY_VALUES)[number]}`) : (a ?? "—");

  const columns: Column<Project>[] = [
    {
      id: "name",
      header: t("projects.columns.name"),
      sortKey: locale === "ar" ? "nameAr" : "nameEn",
      cell: (p) => (
        <div className="flex flex-col">
          <span className="font-medium">{localizedName(p, locale) || `#${p.id}`}</span>
          <span className="text-xs text-muted-foreground" dir={locale === "ar" ? "ltr" : "rtl"}>
            {locale === "ar" ? p.nameEn : p.nameAr}
          </span>
        </div>
      ),
    },
    { id: "status", header: t("projects.columns.status"), cell: (p) => (p.status ? <StatusBadge tone="info">{p.status}</StatusBadge> : "—") },
    { id: "availability", header: t("projects.columns.availability"), cell: (p) => availabilityLabel(p.availability) },
    {
      id: "complete",
      header: t("projects.columns.complete"),
      align: "end",
      cell: (p) => <span className="num">{p.developing_percentage == null ? "—" : `${p.developing_percentage}%`}</span>,
    },
    { id: "active", header: t("projects.columns.active"), cell: (p) => <ActiveBadge value={p.active} /> },
    {
      id: "updated",
      header: t("projects.columns.updated"),
      cell: (p) => <span className="num text-muted-foreground">{formatDate(p.updated_at, locale)}</span>,
    },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FilterBar>
          <FilterSelect label={t("projects.columns.status")} value={state.status} onChange={(v) => set({ status: v })} options={statuses.map((s) => ({ value: s, label: s }))} />
          <FilterSelect
            label={t("projects.columns.active")}
            value={state.active}
            onChange={(v) => set({ active: v })}
            options={[
              { value: "1", label: t("common.active") },
              { value: "0", label: t("common.inactive") },
            ]}
          />
          <ResetFilters count={[state.status, state.active].filter(Boolean).length} onReset={() => setState({ status: null, active: null, page: 1 })} />
        </FilterBar>
        {canEdit && (
          <Button onClick={() => setSheet("new")}>
            <Plus data-icon="inline-start" />
            {t("projects.new")}
          </Button>
        )}
      </div>
      <DataTable
        caption={t("projects.title")}
        columns={columns}
        rows={list.data?.items}
        getRowId={(p) => p.id}
        getRowLabel={(p) => localizedName(p, locale) || `#${p.id}`}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        error={list.error}
        onRetry={() => list.refetch()}
        onRowClick={(p) => setSheet(p.id)}
        sort={{ value: state.sort, onChange: (sort) => set({ sort }) }}
        pagination={paginationProps(list.data?.meta, setState)}
        empty={<EmptyState compact title={t("projects.empty")} />}
      />
      <ProjectFormSheet
        open={sheet !== null}
        projectId={typeof sheet === "number" ? sheet : null}
        statusSuggestions={statuses}
        canEdit={canEdit}
        onClose={() => setSheet(null)}
      />
    </>
  );
}
