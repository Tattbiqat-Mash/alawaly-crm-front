"use client";

import { useLocale, useTranslations } from "next-intl";
import { FilterBar, FilterSelect, ResetFilters, SearchFilter, useDebouncedParam } from "@/components/shared/filters";
import { Input } from "@/components/ui/input";
import { UNIT_STATUSES } from "@/config/statuses";
import { localizedName } from "@/lib/format/localized";
import type { UnitsListState } from "../hooks";
import { useInventoryLookups } from "./use-lookups";

type SetState = (patch: Partial<UnitsListState>) => void;

const decimalOnly = (v: string) => v.replace(/[^\d.]/g, "");

export function UnitsFilters({ state, setState }: { state: UnitsListState; setState: SetState }) {
  const t = useTranslations();
  const locale = useLocale();
  const lookups = useInventoryLookups();
  const set = (patch: Partial<UnitsListState>) => setState({ ...patch, page: 1 });

  const [priceMin, setPriceMin] = useDebouncedParam(state.priceMin, (v) => set({ priceMin: v }), 500);
  const [priceMax, setPriceMax] = useDebouncedParam(state.priceMax, (v) => set({ priceMax: v }), 500);

  const buildings = lookups.buildings.filter((b) => !state.project || String(b.project_id) === state.project);
  const activeCount = [state.q, state.project, state.building, state.status, state.type, state.priceMin, state.priceMax, state.active].filter(Boolean).length;

  return (
    <FilterBar>
      <SearchFilter value={state.q} onChange={(v) => set({ q: v })} placeholder={t("units.filters.search")} />
      <FilterSelect
        label={t("units.filters.project")}
        value={state.project}
        onChange={(v) => set({ project: v, building: null })}
        options={lookups.projects.map((p) => ({ value: String(p.id), label: localizedName(p, locale) || `#${p.id}` }))}
      />
      <FilterSelect
        label={t("units.filters.building")}
        value={state.building}
        onChange={(v) => set({ building: v })}
        options={buildings.map((b) => ({ value: String(b.id), label: lookups.buildingName(b.id) }))}
      />
      <FilterSelect
        label={t("units.filters.status")}
        value={state.status}
        onChange={(v) => set({ status: v })}
        options={UNIT_STATUSES.map((s) => ({ value: s, label: t(`statuses.unit.${s}`) }))}
      />
      <FilterSelect
        label={t("units.filters.type")}
        value={state.type}
        onChange={(v) => set({ type: v })}
        options={lookups.unitTypes.map((u) => ({ value: String(u.id), label: localizedName(u, locale) || `#${u.id}` }))}
      />
      <FilterSelect
        label={t("units.filters.active")}
        value={state.active}
        onChange={(v) => set({ active: v })}
        options={[
          { value: "1", label: t("units.filters.activeOnly") },
          { value: "0", label: t("units.filters.inactiveOnly") },
        ]}
      />
      <div className="flex items-center gap-1.5 rounded-lg border bg-background px-2.5 py-0.5 shadow-2xs">
        <span className="text-xs text-muted-foreground whitespace-nowrap">{t("units.columns.price")}:</span>
        <Input
          inputMode="decimal"
          dir="ltr"
          value={priceMin}
          onChange={(e) => setPriceMin(decimalOnly(e.target.value))}
          placeholder={t("units.filters.priceFrom")}
          aria-label={t("units.filters.priceFrom")}
          className="h-7 w-20 border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-0 md:text-xs"
        />
        <span aria-hidden className="text-muted-foreground/60">
          –
        </span>
        <Input
          inputMode="decimal"
          dir="ltr"
          value={priceMax}
          onChange={(e) => setPriceMax(decimalOnly(e.target.value))}
          placeholder={t("units.filters.priceTo")}
          aria-label={t("units.filters.priceTo")}
          className="h-7 w-20 border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-0 md:text-xs"
        />
      </div>
      <ResetFilters
        count={activeCount}
        onReset={() =>
          setState({ q: null, project: null, building: null, status: null, type: null, priceMin: null, priceMax: null, active: null, page: 1 })
        }
      />
    </FilterBar>
  );
}
