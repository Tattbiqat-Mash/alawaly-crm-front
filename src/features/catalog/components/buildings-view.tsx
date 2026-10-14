"use client";

import { Copy, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { DataTable, type Column } from "@/components/shared/data-table/data-table";
import { paginationProps } from "@/components/shared/data-table/list-params";
import { FilterBar, FilterSelect, ResetFilters } from "@/components/shared/filters";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/features/auth/hooks";
import { useInventoryLookups } from "@/features/inventory/components/use-lookups";
import type { Building } from "@/features/inventory/types";
import { useRouter } from "@/i18n/navigation";
import { localizedField, localizedName } from "@/lib/format/localized";
import { useBuildingsList, useBuildingsState } from "../hooks";
import { ActiveBadge } from "./active-badge";
import { BuildingCreateSheet } from "./building-create-sheet";
import { CloneBuildingDialog } from "./clone-building-dialog";

// S09 — Buildings. The project filter lives in the URL; a row opens the building page.
export function BuildingsView() {
  const t = useTranslations();
  const locale = useLocale();
  const { can } = usePermissions();
  const canEdit = can("inventory.edit");
  const lookups = useInventoryLookups();
  const [state, setState] = useBuildingsState();
  const list = useBuildingsList(state);
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [cloning, setCloning] = useState<Building | null>(null);
  const set = (patch: Partial<typeof state>) => setState({ ...patch, page: 1 });

  const columns: Column<Building>[] = [
    { id: "code", header: t("buildings.columns.code"), cell: (b) => <span className="num font-medium" dir="ltr">{b.building_code ?? `#${b.id}`}</span> },
    { id: "project", header: t("buildings.columns.project"), cell: (b) => lookups.projectName(b.project_id) || "—" },
    { id: "floors", header: t("buildings.columns.floors"), align: "end", cell: (b) => <span className="num">{b.floors_count ?? "—"}</span> },
    {
      id: "address",
      header: t("buildings.columns.address"),
      className: "max-w-72 truncate",
      cell: (b) => <span dir="auto">{localizedField(b, "address", locale) || "—"}</span>,
    },
    { id: "active", header: t("buildings.columns.active"), cell: (b) => <ActiveBadge value={b.active} /> },
    ...(canEdit
      ? [
          {
            id: "clone",
            header: t("buildings.clone.title"),
            align: "end" as const,
            cell: (b: Building) => (
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("buildings.clone.titleFor", { code: b.building_code ?? b.id })}
                onClick={(e) => {
                  e.stopPropagation();
                  setCloning(b);
                }}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <Copy />
              </Button>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FilterBar>
          <FilterSelect
            label={t("buildings.columns.project")}
            value={state.project}
            onChange={(v) => set({ project: v })}
            options={lookups.projects.map((p) => ({ value: String(p.id), label: localizedName(p, locale) || `#${p.id}` }))}
          />
          <FilterSelect
            label={t("buildings.columns.active")}
            value={state.active}
            onChange={(v) => set({ active: v })}
            options={[
              { value: "1", label: t("common.active") },
              { value: "0", label: t("common.inactive") },
            ]}
          />
          <ResetFilters count={[state.project, state.active].filter(Boolean).length} onReset={() => setState({ project: null, active: null, page: 1 })} />
        </FilterBar>
        {canEdit && (
          <Button onClick={() => setCreating(true)}>
            <Plus data-icon="inline-start" />
            {t("buildings.new")}
          </Button>
        )}
      </div>
      <DataTable
        caption={t("buildings.title")}
        columns={columns}
        rows={list.data?.items}
        getRowId={(b) => b.id}
        getRowLabel={(b) => b.building_code ?? `#${b.id}`}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        error={list.error}
        onRetry={() => list.refetch()}
        onRowClick={(b) => router.push(`/buildings/${b.id}`)}
        onRowIntent={(b) => router.prefetch(`/buildings/${b.id}`)}
        pagination={paginationProps(list.data?.meta, setState)}
        empty={<EmptyState compact title={t("buildings.empty")} />}
      />
      {creating && <BuildingCreateSheet defaultProject={state.project} onClose={() => setCreating(false)} />}
      {cloning && <CloneBuildingDialog building={cloning} open onOpenChange={(o) => !o && setCloning(null)} />}
    </>
  );
}
