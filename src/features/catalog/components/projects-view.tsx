"use client";

import { Building, Home, Plus } from "lucide-react";
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
import { Link, useRouter } from "@/i18n/navigation";
import { formatDate } from "@/lib/format/dates";
import { localizedName } from "@/lib/format/localized";
import { useProjectsList, useProjectsState } from "../hooks";
import { ActiveBadge } from "./active-badge";
import { AVAILABILITY_VALUES, ProjectFormSheet } from "./project-form-sheet";

// S08 — Projects. A row opens the project page; buildings and units are one click away.
export function ProjectsView() {
  const t = useTranslations();
  const locale = useLocale();
  const { can } = usePermissions();
  const canEdit = can("inventory.edit");
  const [state, setState] = useProjectsState();
  const list = useProjectsList(state);
  const router = useRouter();
  const [creating, setCreating] = useState(false);
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
    {
      id: "go",
      header: t("projects.columns.open"),
      align: "end",
      cell: (p) => (
        // Links keep their own click; the row click opens the project.
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/buildings?project=${p.id}`}>
              <Building data-icon="inline-start" />
              {t("projects.buildingsLink")}
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/units?project=${p.id}`}>
              <Home data-icon="inline-start" />
              {t("projects.unitsLink")}
            </Link>
          </Button>
        </div>
      ),
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
          <Button onClick={() => setCreating(true)}>
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
        onRowClick={(p) => router.push(`/projects/${p.id}`)}
        onRowIntent={(p) => router.prefetch(`/projects/${p.id}`)}
        sort={{ value: state.sort, onChange: (sort) => set({ sort }) }}
        pagination={paginationProps(list.data?.meta, setState)}
        empty={<EmptyState compact title={t("projects.empty")} />}
      />
      <ProjectFormSheet
        open={creating}
        projectId={null}
        statusSuggestions={statuses}
        canEdit={canEdit}
        onClose={() => setCreating(false)}
        onCreated={(id) => router.push(`/projects/${id}`)}
      />
    </>
  );
}
