"use client";

import { Loader2, Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/format/money";
import { cn } from "@/lib/utils";
import { useUnitSearch } from "../hooks";
import type { UnitListItem } from "../types";
import { UnitStatusBadge } from "./unit-status-badge";
import { useInventoryLookups } from "./use-lookups";

/**
 * Search-and-pick a unit (combobox pattern: arrow keys move, Enter picks, Escape closes).
 * `statuses` limits the search, e.g. ["available"] when reserving.
 */
export function UnitPicker({
  id,
  value,
  onChange,
  statuses,
  invalid,
  describedBy,
}: {
  id: string;
  value: UnitListItem | null;
  onChange: (unit: UnitListItem | null) => void;
  statuses?: readonly string[];
  invalid?: boolean;
  describedBy?: string;
}) {
  const t = useTranslations("common");
  const locale = useLocale();
  const lookups = useInventoryLookups();
  const listId = useId();
  const [text, setText] = useState("");
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const search = useUnitSearch(term, statuses);
  const results = search.data?.items ?? [];

  // Debounce typing → one request per pause.
  useEffect(() => {
    const timer = setTimeout(() => setTerm(text), 250);
    return () => clearTimeout(timer);
  }, [text]);

  const label = (u: UnitListItem) =>
    [u.unit_number ?? `#${u.id}`, lookups.projectName(u.project_id), lookups.buildingName(u.building_id)].filter(Boolean).join(" · ");

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{label(value)}</p>
          <p className="num text-xs text-muted-foreground">{formatMoney(value.price_in_tax, locale)}</p>
        </div>
        <div className="flex items-center gap-2">
          <UnitStatusBadge status={value.status} />
          <Button type="button" variant="ghost" size="icon-sm" aria-label={t("reset")} onClick={() => onChange(null)}>
            <X />
          </Button>
        </div>
      </div>
    );
  }

  const pick = (u: UnitListItem) => {
    onChange(u);
    setText("");
    setOpen(false);
  };

  return (
    <div className="relative">
      <Search aria-hidden className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
        role="combobox"
        aria-expanded={open && term.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        aria-activedescendant={open && results[active] ? `${listId}-${results[active].id}` : undefined}
        autoComplete="off"
        placeholder={t("unitSearch")}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && open && results[active]) {
            e.preventDefault();
            pick(results[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="ps-9"
      />
      {search.isFetching && (
        <Loader2 aria-hidden className="absolute end-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}
      {open && term.length > 0 && (
        <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-auto rounded-lg border bg-popover p-1 shadow-md">
          {results.length === 0 && !search.isFetching && <li className="px-3 py-2 text-sm text-muted-foreground">{t("noMatches")}</li>}
          {results.map((u, i) => (
            <li
              key={u.id}
              id={`${listId}-${u.id}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(u);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn("flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm", i === active && "bg-accent")}
            >
              <span className="min-w-0 truncate">{label(u)}</span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="num text-xs text-muted-foreground">{formatMoney(u.price_in_tax, locale)}</span>
                <UnitStatusBadge status={u.status} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
