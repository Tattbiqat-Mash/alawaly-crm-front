"use client";

import { useMutation } from "@tanstack/react-query";
import { Building2, Download, Loader2, Upload } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/shared/data-table/data-table";
import { EmptyState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/features/auth/hooks";
import { useErrorMessage } from "@/hooks/use-error-message";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/format/dates";
import { isOn } from "@/lib/format/localized";
import { formatDecimal, formatMoney } from "@/lib/format/money";
import { inventoryApi } from "../api";
import { CLEARED_UNIT_FILTERS, usePrefetchUnit, useUnits, useUnitsListState, type UnitsListState } from "../hooks";
import type { UnitListItem } from "../types";
import { UnitsSitePlan } from "./site-plan/units-site-plan";
import { UnitQuickSheet } from "./unit-quick-sheet";
import { UnitStatusBadge } from "./unit-status-badge";
import { UnitsFilters } from "./units-filters";
import { useInventoryLookups } from "./use-lookups";
import { ViewSwitch } from "./view-switch";

/** Header actions: CSV export (reports.view) and import (S06, not built yet). */
export function UnitsActions() {
  const t = useTranslations();
  const { can } = usePermissions();
  const errorMessage = useErrorMessage();
  const exportUnits = useMutation({
    mutationFn: inventoryApi.exportUnits,
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <>
      {can("inventory.import") && (
        <Button variant="outline" asChild>
          <Link href="/units/import">
            <Upload data-icon="inline-start" />
            {t("units.import")}
          </Link>
        </Button>
      )}
      {can("reports.view") && (
        <Button variant="outline" onClick={() => exportUnits.mutate()} disabled={exportUnits.isPending}>
          {exportUnits.isPending ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Download data-icon="inline-start" />}
          {exportUnits.isPending ? t("common.exporting") : t("common.export")}
        </Button>
      )}
    </>
  );
}

// S03 — Units: one filter bar over two views, the table and the site plan. Both open the same quick view.
export function UnitsView() {
  const [state, setState] = useUnitsListState();
  const [selected, setSelected] = useState<UnitListItem | null>(null);

  return (
    <>
      <UnitsFilters state={state} setState={setState} trailing={<ViewSwitch value={state.view} onChange={(view) => setState({ view })} />} />
      {state.view === "plan" ? (
        <UnitsSitePlan state={state} setState={setState} selectedId={selected?.id ?? null} onSelect={setSelected} />
      ) : (
        <UnitsTable state={state} setState={setState} onSelect={setSelected} />
      )}
      <UnitQuickSheet unit={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function UnitsTable({
  state,
  setState,
  onSelect,
}: {
  state: UnitsListState;
  setState: (patch: Partial<UnitsListState>) => void;
  onSelect: (unit: UnitListItem) => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const units = useUnits(state);
  const lookups = useInventoryLookups();
  const prefetchUnit = usePrefetchUnit();

  const columns: Column<UnitListItem>[] = [
    {
      id: "number",
      header: t("units.columns.number"),
      sortKey: "unit_number",
      cell: (u) => (
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="grid size-7.5 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20"
          >
            <Building2 className="size-3.5" />
          </span>
          <div className="flex flex-col">
            <span className="num font-semibold text-foreground">{u.unit_number ?? `#${u.id}`}</span>
            {u.unit_code && <span className="font-mono text-xs text-muted-foreground">{u.unit_code}</span>}
          </div>
        </div>
      ),
    },
    {
      id: "location",
      header: t("units.columns.location"),
      cell: (u) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{lookups.projectName(u.project_id) || "—"}</span>
          <span className="text-xs text-muted-foreground">{lookups.buildingName(u.building_id)}</span>
        </div>
      ),
    },
    {
      id: "type",
      header: t("units.columns.type"),
      cell: (u) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground/90">{lookups.typeName(u.unit_type_id) || "—"}</span>
          {(u.unit_type_id === null || !isOn(u.active)) && <StatusBadge tone="warning">{t("units.hiddenFromApp")}</StatusBadge>}
        </div>
      ),
    },
    { id: "status", header: t("units.columns.status"), sortKey: "status", cell: (u) => <UnitStatusBadge status={u.status} /> },
    { id: "rooms", header: t("units.columns.rooms"), align: "end", cell: (u) => <span className="num font-medium text-foreground/90">{u.rooms ?? "—"}</span> },
    {
      id: "area",
      header: t("units.columns.area"),
      align: "end",
      cell: (u) => (
        <span className="num font-medium text-foreground/90">
          {formatDecimal(u.total_area, locale)}{" "}
          <span className="text-[11px] font-normal text-muted-foreground">m²</span>
        </span>
      ),
    },
    {
      id: "price",
      header: t("units.columns.price"),
      align: "end",
      sortKey: "price_in_tax",
      cell: (u) => <span className="num font-semibold text-foreground">{formatMoney(u.price_in_tax, locale)}</span>,
    },
    {
      id: "updated",
      header: t("units.columns.updated"),
      sortKey: "updated_at",
      cell: (u) => <span className="num text-xs text-muted-foreground">{formatDate(u.updated_at, locale)}</span>,
    },
  ];

  return (
    <DataTable
      caption={t("units.title")}
      columns={columns}
      rows={units.data?.items}
      getRowId={(u) => u.id}
      getRowLabel={(u) => t("units.quick.title", { number: u.unit_number ?? `#${u.id}` })}
      isLoading={units.isLoading}
      isFetching={units.isFetching}
      error={units.error}
      onRetry={() => units.refetch()}
      onRowClick={onSelect}
      onRowIntent={(u) => prefetchUnit(u.id)}
      sort={{ value: state.sort, onChange: (sort) => setState({ sort, page: 1 }) }}
      pagination={
        units.data
          ? {
              page: units.data.meta.page,
              pageSize: units.data.meta.pageSize,
              total: units.data.meta.total,
              onPageChange: (page) => setState({ page }),
              onPageSizeChange: (pageSize) => setState({ pageSize, page: 1 }),
            }
          : undefined
      }
      empty={
        <EmptyState
          compact
          title={t("units.empty")}
          description={t("units.emptyHint")}
          action={
            <Button variant="outline" size="sm" onClick={() => setState(CLEARED_UNIT_FILTERS)}>
              {t("common.reset")}
            </Button>
          }
        />
      }
    />
  );
}
