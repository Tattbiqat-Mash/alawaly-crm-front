"use client";

import { Building2, Rows3 } from "lucide-react";
import { useTranslations } from "next-intl";
import { ToggleGroup } from "radix-ui";
import { cn } from "@/lib/utils";
import { UNITS_VIEWS, type UnitsViewMode } from "../hooks";

const icons = { table: Rows3, plan: Building2 } as const;

/** Table ⇄ site plan. Filters are shared, so switching never loses them. */
export function ViewSwitch({ value, onChange }: { value: UnitsViewMode; onChange: (view: UnitsViewMode) => void }) {
  const t = useTranslations("units.view");
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      // Radix sends "" when the pressed item is clicked again; a view is always selected.
      onValueChange={(v) => v && onChange(v as UnitsViewMode)}
      aria-label={t("label")}
      className="ms-auto inline-flex h-8 items-center gap-0.5 rounded-lg border bg-muted/60 p-0.5"
    >
      {UNITS_VIEWS.map((view) => {
        const Icon = icons[view];
        return (
          <ToggleGroup.Item
            key={view}
            value={view}
            className={cn(
              "inline-flex h-full items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-colors outline-none",
              "hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
              "data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-2xs",
            )}
          >
            <Icon aria-hidden className="size-3.5" />
            {t(view)}
          </ToggleGroup.Item>
        );
      })}
    </ToggleGroup.Root>
  );
}
