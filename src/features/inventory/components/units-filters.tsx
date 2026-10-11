"use client";

import { Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UNIT_STATUSES } from "@/config/statuses";
import { localizedName } from "@/lib/format/localized";
import { cn } from "@/lib/utils";
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
  const isSelected = value !== null && value !== ALL;
  return (
    <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? null : v)}>
      <SelectTrigger
        aria-label={label}
        className={cn(
          "h-9 min-w-36 bg-background shadow-2xs transition-colors",
          isSelected && "border-primary/50 bg-primary/5 font-medium text-foreground",
        )}
      >
        <span className={cn("text-xs", isSelected ? "font-semibold text-primary" : "text-muted-foreground")}>
          {label}:
        </span>
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
  const activeCount = [state.q, state.project, state.building, state.status, state.type, state.priceMin, state.priceMax, state.active].filter(Boolean).length;
  const hasFilters = activeCount > 0;

  return (
    <div
      className="flex flex-wrap items-center gap-2.5 rounded-xl border bg-card/60 p-3 shadow-2xs backdrop-blur-xs"
      role="group"
      aria-label={t("common.filters")}
    >
      <div className="relative w-full sm:w-60">
        <Search aria-hidden className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("units.filters.search")}
          aria-label={t("units.filters.search")}
          className="h-9 bg-background ps-9 pe-3 shadow-2xs text-xs md:text-sm"
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
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={() =>
            setState({ q: null, project: null, building: null, status: null, type: null, priceMin: null, priceMax: null, active: null, page: 1 })
          }
        >
          <X className="size-3.5" />
          <span>{t("common.reset")}</span>
          <span className="grid size-4.5 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
            {activeCount}
          </span>
        </Button>
      )}
    </div>
  );
}
