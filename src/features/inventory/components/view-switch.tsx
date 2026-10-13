"use client";

import { Building2, Rows3 } from "lucide-react";
import { useTranslations } from "next-intl";
import { ToggleGroup } from "radix-ui";
import { cn } from "@/lib/utils";
import { UNITS_VIEWS, type UnitsViewMode } from "../hooks";

const icons = { table: Rows3, plan: Building2 } as const;

/** Table ⇄ site plan. Filters are shared, so switching never loses them. A pill slides under the chosen view; icons only while the page header is narrow. */
export function ViewSwitch({ value, onChange }: { value: UnitsViewMode; onChange: (view: UnitsViewMode) => void }) {
  const t = useTranslations("units.view");
  const index = UNITS_VIEWS.indexOf(value);
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      // Radix sends "" when the pressed item is clicked again; a view is always selected.
      onValueChange={(v) => v && onChange(v as UnitsViewMode)}
      aria-label={t("label")}
      className="relative grid h-7 shrink-0 grid-cols-2 items-center rounded-full border bg-muted/60 p-0.5"
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0.5 start-0.5 w-[calc(50%-2px)] rounded-full bg-primary shadow-sm",
          "transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none",
          index === 1 && "translate-x-full rtl:-translate-x-full",
        )}
      />
      {UNITS_VIEWS.map((view) => {
        const Icon = icons[view];
        return (
          <ToggleGroup.Item
            key={view}
            value={view}
            title={t(view)}
            className={cn(
              "group relative z-10 inline-flex h-full items-center justify-center gap-1.5 rounded-full px-3 text-xs font-medium whitespace-nowrap @max-2xl:px-2.5 text-muted-foreground transition-colors duration-300 outline-none",
              "hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
              "data-[state=on]:text-primary-foreground data-[state=on]:hover:text-primary-foreground",
            )}
          >
            <Icon
              aria-hidden
              className="size-3.5 transition-transform group-hover:scale-110 group-data-[state=on]:animate-in group-data-[state=on]:zoom-in-50 group-data-[state=on]:spin-in-[-20deg] group-data-[state=on]:duration-500"
            />
            <span className="@max-2xl:sr-only">{t(view)}</span>
          </ToggleGroup.Item>
        );
      })}
    </ToggleGroup.Root>
  );
}
