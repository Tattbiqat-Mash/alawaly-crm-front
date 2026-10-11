"use client";

import { Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UNIT_STATUSES } from "@/config/statuses";
import { localizedName } from "@/lib/format/localized";
import type { UnitsListState } from "../hooks";
import { useInventoryLookups } from "./use-lookups";

type SetState = (patch: Partial<UnitsListState>) => void;

const ALL = "all";

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  options: { value: string; label: string }[];
  allLabel: string;
}) {
  return (
    <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? null : v)}>
      <SelectTrigger aria-label={label} className="h-9 min-w-36">
        <span className="text-muted-foreground">{label}:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Debounced text input bound to a URL param (no request per keystroke). */
function useDebouncedParam(value: string | null, commit: (v: string | null) => void, delay = 300) {
  const [draft, setDraft] = useState(value ?? "");
  // Follow outside changes (reset, back/forward) by adjusting state during render.
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    setDraft(value ?? "");
  }
  useEffect(() => {
    const next = draft.trim() || null;
    if (next === (value ?? null)) return;
    const timer = setTimeout(() => commit(next), delay);
    return () => clearTimeout(timer);
  }, [draft, value, commit, delay]);
  return [draft, setDraft] as const;
}

const decimalOnly = (v: string) => v.replace(/[^\d.]/g, "");

export function UnitsFilters({ state, setState }: { state: UnitsListState; setState: SetState }) {
  const t = useTranslations();
  const locale = useLocale();
  const lookups = useInventoryLookups();
  const set = (patch: Partial<UnitsListState>) => setState({ ...patch, page: 1 });

  const [q, setQ] = useDebouncedParam(state.q, (v) => set({ q: v }));
  const [priceMin, setPriceMin] = useDebouncedParam(state.priceMin, (v) => set({ priceMin: v }), 500);
  const [priceMax, setPriceMax] = useDebouncedParam(state.priceMax, (v) => set({ priceMax: v }), 500);

  const buildings = lookups.buildings.filter((b) => !state.project || String(b.project_id) === state.project);
  const hasFilters = [state.q, state.project, state.building, state.status, state.type, state.priceMin, state.priceMax, state.active].some(Boolean);

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("common.filters")}>
      <div className="relative w-full sm:w-64">
        <Search aria-hidden className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("units.filters.search")}
          aria-label={t("units.filters.search")}
          className="h-9 ps-8"
        />
      </div>
      <FilterSelect
        label={t("units.filters.project")}
        allLabel={t("common.all")}
        value={state.project}
        onChange={(v) => set({ project: v, building: null })}
        options={lookups.projects.map((p) => ({ value: String(p.id), label: localizedName(p, locale) || `#${p.id}` }))}
      />
      <FilterSelect
        label={t("units.filters.building")}
        allLabel={t("common.all")}
        value={state.building}
        onChange={(v) => set({ building: v })}
        options={buildings.map((b) => ({ value: String(b.id), label: lookups.buildingName(b.id) }))}
      />
      <FilterSelect
        label={t("units.filters.status")}
        allLabel={t("common.all")}
        value={state.status}
        onChange={(v) => set({ status: v })}
        options={UNIT_STATUSES.map((s) => ({ value: s, label: t(`statuses.unit.${s}`) }))}
      />
      <FilterSelect
        label={t("units.filters.type")}
        allLabel={t("common.all")}
        value={state.type}
        onChange={(v) => set({ type: v })}
        options={lookups.unitTypes.map((u) => ({ value: String(u.id), label: localizedName(u, locale) || `#${u.id}` }))}
      />
      <FilterSelect
        label={t("units.filters.active")}
        allLabel={t("common.all")}
        value={state.active}
        onChange={(v) => set({ active: v })}
        options={[
          { value: "1", label: t("units.filters.activeOnly") },
          { value: "0", label: t("units.filters.inactiveOnly") },
        ]}
      />
      <div className="flex items-center gap-1">
        <Input
          inputMode="decimal"
          dir="ltr"
          value={priceMin}
          onChange={(e) => setPriceMin(decimalOnly(e.target.value))}
          placeholder={t("units.filters.priceFrom")}
          aria-label={t("units.filters.priceFrom")}
          className="h-9 w-28"
        />
        <span aria-hidden className="text-muted-foreground">
          –
        </span>
        <Input
          inputMode="decimal"
          dir="ltr"
          value={priceMax}
          onChange={(e) => setPriceMax(decimalOnly(e.target.value))}
          placeholder={t("units.filters.priceTo")}
          aria-label={t("units.filters.priceTo")}
          className="h-9 w-28"
        />
      </div>
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            setState({ q: null, project: null, building: null, status: null, type: null, priceMin: null, priceMax: null, active: null, page: 1 })
          }
        >
          <X data-icon="inline-start" />
          {t("common.reset")}
        </Button>
      )}
    </div>
  );
}
