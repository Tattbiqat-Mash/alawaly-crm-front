"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const ALL = "all";

export type FilterOption = { value: string; label: string };

const CompactContext = createContext(false);

/** True inside a compact FilterBar; controls in the bar shrink to h-7. */
export const useCompactFilters = () => useContext(CompactContext);

/** Filter bar container shared by every list screen. `compact` drops the card shell and shrinks controls, for table-first pages. */
export function FilterBar({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  const t = useTranslations("common");
  return (
    <CompactContext.Provider value={compact}>
      <div
        className={cn(
          "flex items-center",
          compact
            ? // Below lg: one swipeable line running edge to edge (bleeding into PageContainer's gutter) instead of several wrapped rows.
              cn(
                "gap-1.5 *:shrink-0 lg:flex-wrap",
                "max-lg:overflow-x-auto max-lg:py-0.5 max-lg:[scrollbar-width:none] max-lg:[&::-webkit-scrollbar]:hidden",
                "max-sm:-mx-3 max-sm:px-3 sm:max-md:-mx-4 sm:max-md:px-4 md:max-lg:-mx-6 md:max-lg:px-6",
              )
            : "flex-wrap gap-2 rounded-xl border bg-card/60 p-2 shadow-2xs backdrop-blur-xs sm:p-2.5",
        )}
        role="group"
        aria-label={t("filters")}
      >
        {children}
      </div>
    </CompactContext.Provider>
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
  const compact = useCompactFilters();
  const isSelected = value !== null && value !== ALL;
  return (
    <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? null : v)}>
      <SelectTrigger
        aria-label={label}
        size={compact ? "sm" : "default"}
        className={cn(
          "bg-background shadow-2xs transition-colors text-xs",
          compact ? "h-7 min-w-24 gap-1 ps-2 pe-1.5 [&_svg]:size-3.5" : "h-8 min-w-32",
          isSelected && "border-primary/50 bg-primary/5 font-medium text-foreground",
        )}
      >
        <span className={cn("text-[11px]", isSelected ? "font-semibold text-primary" : "text-muted-foreground")}>{label}:</span>
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
  const compact = useCompactFilters();
  return (
    <div className={cn("relative w-full", compact ? "sm:w-44" : "sm:w-56", className)}>
      <Search aria-hidden className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        inputMode={inputMode}
        value={draft}
        onChange={(e) => setDraft(inputMode === "numeric" ? e.target.value.replace(/\D/g, "") : e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn("bg-background ps-8 pe-3 text-xs shadow-2xs md:text-xs", compact ? "h-7" : "h-8")}
      />
    </div>
  );
}

/**
 * Search that rests as an icon and opens on focus, then widens with the text as you type.
 * Press "/" anywhere to jump into it; Escape clears it. On phones it covers the header row while focused.
 */
export function ExpandingSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder: string;
}) {
  const t = useTranslations("common");
  const [draft, setDraft] = useDebouncedParam(value, onChange);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const open = focused || draft.length > 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest("input, textarea, select, [contenteditable=true]")) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    // Holds the icon's place in the row. On phones the focused field lifts out and spans the nearest
    // positioned ancestor (the compact page header), then folds back to the icon on blur.
    <div className="flex min-w-0 max-sm:size-7 max-sm:shrink-0">
      <label
        className={cn(
          "flex h-7 cursor-text items-center overflow-hidden rounded-lg border bg-background text-xs shadow-2xs",
          "transition-[width,border-color,background-color] duration-300 ease-out motion-reduce:transition-none",
          "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
          // Opaque tint: on phones the focused field sits over the header title and buttons.
          draft && "border-primary/50 bg-[color-mix(in_oklab,var(--primary)_5%,var(--background))]",
          !open && "cursor-pointer hover:bg-muted",
          focused
            ? "max-sm:absolute max-sm:inset-x-0 max-sm:top-1/2 max-sm:z-20 max-sm:w-auto! max-sm:-translate-y-1/2 max-sm:animate-in max-sm:fade-in max-sm:zoom-in-95"
            : "max-sm:w-7!",
        )}
        // Grows a character at a time while typing, between a comfortable minimum and a cap.
        style={{ width: open ? `clamp(11rem, calc(3.5rem + ${draft.length + 2}ch), 20rem)` : "1.75rem" }}
      >
        <Search
          aria-hidden
          className={cn("pointer-events-none mx-[6.5px] size-3.5 shrink-0 transition-colors", draft ? "text-primary" : "text-muted-foreground")}
        />
        <input
          ref={inputRef}
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key !== "Escape") return;
            setDraft("");
            e.currentTarget.blur();
          }}
          placeholder={open ? placeholder : ""}
          aria-label={placeholder}
          className="h-full min-w-0 flex-1 appearance-none bg-transparent pe-1 outline-none placeholder:text-muted-foreground max-sm:text-base [&::-webkit-search-cancel-button]:hidden"
        />
        {draft && (
          <button
            type="button"
            aria-label={t("clear")}
            // Keep focus in the field (pointer covers mouse and touch).
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              setDraft("");
              inputRef.current?.focus();
            }}
            className={cn(
              "me-1 grid size-5 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors animate-in fade-in zoom-in-50 hover:bg-muted hover:text-foreground",
              !focused && "max-sm:hidden",
            )}
          >
            <X className="size-3" />
          </button>
        )}
      </label>
    </div>
  );
}

/** "Reset filters" with the number of active filters; hidden when nothing is filtered. */
export function ResetFilters({ count, onReset }: { count: number; onReset: () => void }) {
  const t = useTranslations("common");
  const compact = useCompactFilters();
  if (count === 0) return null;
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("gap-1.5 text-xs text-muted-foreground hover:text-foreground", compact ? "h-7 px-2" : "h-8")}
      onClick={onReset}
    >
      <X className="size-3" />
      <span>{t("reset")}</span>
      <span className="grid size-4 place-items-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">{count}</span>
    </Button>
  );
}
