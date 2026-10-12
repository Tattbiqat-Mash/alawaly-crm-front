"use client";

import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { FilterBar, FilterSelect, ResetFilters, SearchFilter, useDebouncedParam } from "@/components/shared/filters";
import { Input } from "@/components/ui/input";
import { UNIT_STATUSES } from "@/config/statuses";
import { localizedName } from "@/lib/format/localized";
import { cn } from "@/lib/utils";
import { CLEARED_UNIT_FILTERS, type UnitsListState } from "../hooks";
import { useInventoryLookups } from "./use-lookups";

type SetState = (patch: Partial<UnitsListState>) => void;

const decimalOnly = (v: string) => v.replace(/[^\d.]/g, "");

/** `trailing` sits at the end of the bar (the table/plan switch). */
export function UnitsFilters({ state, setState, trailing }: { state: UnitsListState; setState: SetState; trailing?: ReactNode }) {
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
      <div
        className={cn(
          "flex h-8 items-center gap-1.5 rounded-lg border bg-background px-2.5 shadow-2xs transition-colors",
          (Boolean(priceMin) || Boolean(priceMax)) && "border-primary/50 bg-primary/5 text-foreground",
        )}
      >
        <span
          className={cn(
            "text-[11px] whitespace-nowrap",
            Boolean(priceMin) || Boolean(priceMax) ? "font-semibold text-primary" : "text-muted-foreground",
          )}
        >
          {t("units.columns.price")}:
        </span>
        <Input
          inputMode="decimal"
          dir="ltr"
          value={priceMin}
          onChange={(e) => setPriceMin(decimalOnly(e.target.value))}
          placeholder={t("units.filters.priceFrom")}
          aria-label={t("units.filters.priceFrom")}
          className="h-6 w-16 border-0 bg-transparent px-1 text-center text-xs shadow-none focus-visible:ring-0 md:text-xs num"
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
          className="h-6 w-16 border-0 bg-transparent px-1 text-center text-xs shadow-none focus-visible:ring-0 md:text-xs num"
        />
      </div>
      <ResetFilters count={activeCount} onReset={() => setState(CLEARED_UNIT_FILTERS)} />
      {trailing}
    </FilterBar>
  );
}
