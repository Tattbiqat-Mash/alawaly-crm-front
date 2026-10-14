"use client";

import { Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { DataTable, type Column } from "@/components/shared/data-table/data-table";
import { paginationProps } from "@/components/shared/data-table/list-params";
import { FilterBar, FilterSelect, ResetFilters, SearchFilter } from "@/components/shared/filters";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/features/auth/hooks";
import { useInventoryLookups } from "@/features/inventory/components/use-lookups";
import type { UnitTemplate } from "@/features/inventory/types";
import { localizedName } from "@/lib/format/localized";
import { formatCount, formatDecimal, formatMoney } from "@/lib/format/money";
import { useUnitTemplatesList, useUnitTemplatesState } from "../hooks";
import { ActiveBadge } from "./active-badge";
import { UnitTemplateFormSheet } from "./unit-template-form-sheet";

// S25 — Unit templates: shared data (type, rooms, areas, prices, media, features) that units inherit.
export function UnitTemplatesView() {
  const t = useTranslations();
  const locale = useLocale();
  const { can } = usePermissions();
  const canEdit = can("inventory.edit");
  const lookups = useInventoryLookups();
  const [state, setState] = useUnitTemplatesState();
  const list = useUnitTemplatesList(state);
  const [sheet, setSheet] = useState<null | "new" | number>(null);
  const set = (patch: Partial<typeof state>) => setState({ ...patch, page: 1 });

  const columns: Column<UnitTemplate>[] = [
    {
      id: "code",
      header: t("unitTemplates.columns.code"),
      sortKey: "style_code",
      cell: (u) => (
        <span className="font-mono text-xs font-semibold" dir="ltr">
          {u.style_code ?? `#${u.id}`}
        </span>
      ),
    },
    { id: "name", header: t("unitTemplates.columns.name"), cell: (u) => <span className="font-medium">{localizedName(u, locale) || "—"}</span> },
    { id: "type", header: t("unitTemplates.columns.type"), cell: (u) => lookups.typeName(u.unit_type_id) || "—" },
    { id: "beds", header: t("unitTemplates.columns.bedrooms"), align: "end", cell: (u) => <span className="num">{u.bedrooms ?? "—"}</span> },
    { id: "baths", header: t("unitTemplates.columns.bathrooms"), align: "end", cell: (u) => <span className="num">{u.bathrooms ?? "—"}</span> },
    {
      id: "area",
      header: t("unitTemplates.columns.area"),
      align: "end",
      cell: (u) => <span className="num">{u.area_m2 ? `${formatDecimal(u.area_m2, locale)} m²` : "—"}</span>,
    },
    {
      id: "price",
      header: t("unitTemplates.columns.price"),
      align: "end",
      sortKey: "price_in_tax",
      cell: (u) => <span className="num font-medium">{formatMoney(u.price_in_tax, locale)}</span>,
    },
    { id: "units", header: t("unitTemplates.columns.units"), align: "end", cell: (u) => <span className="num">{formatCount(u.units_count ?? 0, locale)}</span> },
    { id: "active", header: t("unitTemplates.columns.active"), cell: (u) => <ActiveBadge value={u.active} /> },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FilterBar>
          <SearchFilter value={state.q} onChange={(q) => set({ q })} placeholder={t("unitTemplates.search")} />
          <FilterSelect
            label={t("unitTemplates.columns.type")}
            value={state.type}
            onChange={(v) => set({ type: v })}
            options={lookups.unitTypes.map((u) => ({ value: String(u.id), label: localizedName(u, locale) || `#${u.id}` }))}
          />
          <FilterSelect
            label={t("unitTemplates.columns.active")}
            value={state.active}
            onChange={(v) => set({ active: v })}
            options={[
              { value: "1", label: t("common.active") },
              { value: "0", label: t("common.inactive") },
            ]}
          />
          <ResetFilters count={[state.q, state.type, state.active].filter(Boolean).length} onReset={() => setState({ q: null, type: null, active: null, page: 1 })} />
        </FilterBar>
        {canEdit && (
          <Button onClick={() => setSheet("new")}>
            <Plus data-icon="inline-start" />
            {t("unitTemplates.new")}
          </Button>
        )}
      </div>
      <DataTable
        caption={t("unitTemplates.title")}
        columns={columns}
        rows={list.data?.items}
        getRowId={(u) => u.id}
        getRowLabel={(u) => u.style_code ?? `#${u.id}`}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        error={list.error}
        onRetry={() => list.refetch()}
        onRowClick={(u) => setSheet(u.id)}
        sort={{ value: state.sort, onChange: (sort) => set({ sort }) }}
        pagination={paginationProps(list.data?.meta, setState)}
        empty={<EmptyState compact title={t("unitTemplates.empty")} description={canEdit ? t("unitTemplates.emptyHint") : undefined} />}
      />
      {sheet !== null && (
        <UnitTemplateFormSheet key={sheet} templateId={sheet === "new" ? null : sheet} canEdit={canEdit} onClose={() => setSheet(null)} />
      )}
    </>
  );
}
