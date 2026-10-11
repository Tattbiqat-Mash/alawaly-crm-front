"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const ALL = "all";

export type FilterOption = { value: string; label: string };

/** Filter bar container shared by every list screen. */
export function FilterBar({ children }: { children: ReactNode }) {
  const t = useTranslations("common");
  return (
    <div
      className="flex flex-wrap items-center gap-2.5 rounded-xl border bg-card/60 p-3 shadow-2xs backdrop-blur-xs"
      role="group"
      aria-label={t("filters")}
    >
      {children}
    </div>
  );
}

/** A labelled select with an "All" option; null means "not filtered". */
export function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  options: FilterOption[];
}) {
  const t = useTranslations("common");
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
        <span className={cn("text-xs", isSelected ? "font-semibold text-primary" : "text-muted-foreground")}>{label}:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{t("all")}</SelectItem>
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
export function useDebouncedParam(value: string | null, commit: (v: string | null) => void, delay = 300) {
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

/** Debounced search box bound to a URL param. */
export function SearchFilter({
  value,
  onChange,
  placeholder,
  className,
  inputMode,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder: string;
  className?: string;
  inputMode?: "search" | "numeric";
}) {
  const [draft, setDraft] = useDebouncedParam(value, onChange);
  return (
    <div className={cn("relative w-full sm:w-60", className)}>
      <Search aria-hidden className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        inputMode={inputMode}
        value={draft}
        onChange={(e) => setDraft(inputMode === "numeric" ? e.target.value.replace(/\D/g, "") : e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 bg-background ps-9 pe-3 text-xs shadow-2xs md:text-sm"
      />
    </div>
  );
}

/** "Reset filters" with the number of active filters; hidden when nothing is filtered. */
export function ResetFilters({ count, onReset }: { count: number; onReset: () => void }) {
  const t = useTranslations("common");
  if (count === 0) return null;
  return (
    <Button variant="ghost" size="sm" className="h-9 gap-1.5 text-muted-foreground hover:text-foreground" onClick={onReset}>
      <X className="size-3.5" />
      <span>{t("reset")}</span>
      <span className="grid size-4.5 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">{count}</span>
    </Button>
  );
}
