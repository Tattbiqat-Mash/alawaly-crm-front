"use client";

import { useLocale, useTranslations } from "next-intl";
import { memo, useMemo, type CSSProperties } from "react";
import { isUnitStatus } from "@/config/statuses";
import { formatCount, formatDecimal } from "@/lib/format/money";
import { cn } from "@/lib/utils";
import { countByStatus, type PlanBuilding, type PlanFloor } from "../../site-plan";
import type { UnitListItem } from "../../types";
import { StatusBar } from "./status-bar";
import { ghostTone, windowTone } from "./unit-tone";

export type PlanZoom = "sm" | "md" | "lg";
export const PLAN_ZOOMS: readonly PlanZoom[] = ["sm", "md", "lg"];

/** Window size per zoom, read by every unit cell through CSS variables. */
export const zoomStyle: Record<PlanZoom, CSSProperties> = {
  sm: { "--cell-w": "1.25rem", "--cell-h": "1rem" } as CSSProperties,
  md: { "--cell-w": "3rem", "--cell-h": "1.875rem" } as CSSProperties,
  lg: { "--cell-w": "4.75rem", "--cell-h": "2.75rem" } as CSSProperties,
};

type Props = {
  plan: PlanBuilding;
  title: string;
  zoom: PlanZoom;
  /** Position on the stage; staggers the entrance so the site rises building by building. */
  index: number;
  /** Ids the narrowing filters keep; null = nothing is narrowed, every unit is lit. */
  matches: Set<number> | null;
  selectedId: number | null;
  /** Narrows the plan (and the building filter) to this building. */
  onFocusBuilding?: (buildingId: number) => void;
};

// Entrance timing (ms): buildings rise one after another, then their floors light up bottom to top.
const BUILDING_STAGGER = 90;
const MAX_STAGGERED = 8;
const LIGHTS_AFTER = 300;
const FLOOR_STAGGER = 35;

const riseDelay = (ms: number) => ({ "--rise-delay": `${ms}ms` }) as CSSProperties;

/** A small decorative tree beside the entrance. */
function Tree({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("pointer-events-none absolute bottom-1 flex flex-col items-center", className)}>
      <span className="size-5 rounded-full bg-linear-to-br from-success/45 to-success/25 ring-1 ring-success/20 dark:from-success/25 dark:to-success/10" />
      <span className="-mt-0.5 h-2.5 w-0.5 rounded-full bg-foreground/25" />
    </span>
  );
}

/**
 * One building drawn as a front elevation: sign, roof, floors of unit windows, lobby and ground.
 * Units carry `data-unit-id`; hover, focus and click are handled once by the plan (delegation).
 */
export const BuildingElevation = memo(function BuildingElevation({ plan, title, zoom, index, matches, selectedId, onFocusBuilding }: Props) {
  const t = useTranslations("units.plan");
  const locale = useLocale();
  const counts = useMemo(() => countByStatus(plan.units), [plan.units]);
  const matched = matches ? plan.units.filter((u) => matches.has(u.id)).length : null;
  const floorCount = plan.floors.filter((f) => f.floor !== null).length;
  const { id } = plan;
  const focus = onFocusBuilding && id !== null ? () => onFocusBuilding(id) : undefined;
  const Sign = focus ? "button" : "div";
  const start = Math.min(index, MAX_STAGGERED) * BUILDING_STAGGER;
  const lastFloor = plan.floors.length - 1;

  return (
    <section aria-label={title} className="flex flex-col items-center px-6">
      <Sign
        {...(focus && { type: "button" as const, onClick: focus, title: t("focusBuilding") })}
        style={riseDelay(start + LIGHTS_AFTER)}
        className={cn(
          "plan-fade mb-4 flex min-w-36 flex-col items-center gap-1 rounded-xl border bg-card/95 px-3.5 py-2 shadow-sm backdrop-blur-sm",
          focus &&
            "outline-none transition-[border-color,transform,box-shadow] hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50",
        )}
      >
        <span className="text-sm font-bold tracking-tight text-foreground">{title}</span>
        <span className="num text-[11px] whitespace-nowrap text-muted-foreground">
          {floorCount > 0 && <>{t("floors", { count: floorCount })} · </>}
          {t("units", { count: plan.units.length })}
          {matched !== null && (
            <span className={cn("font-semibold", matched > 0 ? "text-primary" : "text-muted-foreground")}>
              {" · "}
              {t("matching", { count: formatCount(matched, locale) })}
            </span>
          )}
        </span>
        <StatusBar counts={counts} className="mt-0.5 h-1.5" />
      </Sign>

      <div className="relative inline-flex min-w-24 flex-col">
        <div
          style={riseDelay(start)}
          className="plan-rise relative flex flex-col drop-shadow-[0_14px_18px_rgb(0_0_0/0.12)] dark:drop-shadow-[0_14px_22px_rgb(0_0_0/0.5)]"
        >
          {/* Side wall in perspective, so the block reads as a volume rather than a flat card. */}
          <span
            aria-hidden
            className="absolute top-2 bottom-0 -end-2.5 w-2.5 origin-left skew-y-[-40deg] bg-linear-to-b from-foreground/20 to-foreground/10 rtl:origin-right rtl:skew-y-[40deg]"
          />
          {/* Roof: stair tower and parapet */}
          <div aria-hidden className="flex justify-end px-[18%]">
            <span className="h-3 w-1/4 min-w-6 rounded-t-[3px] bg-foreground/15" />
          </div>
          <div aria-hidden className="-mx-1 h-2 rounded-t-[3px] bg-linear-to-b from-foreground/30 to-foreground/20" />

          <div
            className={cn(
              "flex flex-col divide-y divide-foreground/8 border-x border-foreground/15 bg-secondary px-1.5",
              // Sky reflection from the top, and faint cladding seams so an empty wall still reads as a facade.
              "bg-[image:linear-gradient(to_bottom,color-mix(in_oklch,var(--card)_55%,transparent),transparent_60%),repeating-linear-gradient(90deg,transparent_0_31px,color-mix(in_oklch,var(--foreground)_4%,transparent)_31px_32px)]",
            )}
          >
            {plan.floors.length === 0 ? (
              <p className="px-2 py-4 text-center text-[11px] text-muted-foreground">{t("emptyBuilding")}</p>
            ) : (
              plan.floors.map((floor, i) => (
                <FloorRow
                  key={floor.floor ?? "unknown"}
                  floor={floor}
                  zoom={zoom}
                  matches={matches}
                  selectedId={selectedId}
                  style={riseDelay(start + LIGHTS_AFTER + (lastFloor - i) * FLOOR_STAGGER)}
                />
              ))
            )}
          </div>

          {/* Lobby: a lit entrance under its canopy */}
          <div aria-hidden className="relative h-5 border-x border-foreground/15 bg-secondary">
            <span className="absolute inset-x-0 bottom-3.5 mx-auto h-0.5 w-11 rounded-full bg-foreground/30" />
            <span className="absolute inset-x-0 bottom-0 mx-auto h-3.5 w-7 rounded-t-[3px] border border-b-0 border-foreground/20 bg-linear-to-b from-sand/40 to-sand/15" />
          </div>
        </div>

        <Tree className="-start-7" />
        <Tree className="-end-8 scale-75" />
        {/* Ground: the pavement and the soft shadow the building casts on it */}
        <div aria-hidden className="relative -mx-9 h-1.5 rounded-full bg-foreground/15" />
        <div aria-hidden className="-mx-6 -mt-0.5 h-3 rounded-[50%] bg-foreground/10 blur-sm" />
      </div>
    </section>
  );
});

function FloorRow({
  floor,
  zoom,
  matches,
  selectedId,
  style,
}: {
  floor: PlanFloor;
  zoom: PlanZoom;
  matches: Set<number> | null;
  selectedId: number | null;
  style?: CSSProperties;
}) {
  const t = useTranslations("units.plan");
  const short = floor.floor === null ? "?" : floor.floor === 0 ? t("groundShort") : floor.floor;
  const label = floor.floor === null ? t("unknownFloor") : floor.floor === 0 ? t("groundFloor") : t("floor", { floor: floor.floor });

  return (
    <div
      role="group"
      aria-label={label}
      style={style}
      className={cn("plan-light flex items-center gap-1.5 py-1", floor.floor === null && "border-dashed")}
    >
      <span aria-hidden title={label} className="num w-5 shrink-0 text-center text-[10px] font-medium text-muted-foreground/80">
        {short}
      </span>
      <div className="flex flex-1 gap-1">
        {floor.units.length === 0 ? (
          <span aria-hidden className="h-(--cell-h) min-w-(--cell-w) flex-1 rounded-[3px] border border-dashed border-foreground/10" />
        ) : (
          floor.units.map((unit) => (
            <UnitWindow
              key={unit.id}
              unit={unit}
              zoom={zoom}
              dimmed={matches !== null && !matches.has(unit.id)}
              selected={unit.id === selectedId}
            />
          ))
        )}
      </div>
    </div>
  );
}

function UnitWindow({ unit, zoom, dimmed, selected }: { unit: UnitListItem; zoom: PlanZoom; dimmed: boolean; selected: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const status = isUnitStatus(unit.status) ? unit.status : "unknown";
  const number = unit.unit_number ?? `#${unit.id}`;

  return (
    <button
      type="button"
      data-unit-id={unit.id}
      aria-label={`${t("units.quick.title", { number })}, ${t(`statuses.unit.${status}`)}`}
      aria-current={selected || undefined}
      className={cn(
        "relative flex h-(--cell-h) min-w-(--cell-w) flex-1 flex-col items-center justify-center overflow-hidden rounded-[3px] border leading-none",
        "transition-[opacity,filter,background-color,box-shadow,transform] duration-200 outline-none",
        "focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-secondary",
        // Glass sheen.
        "before:pointer-events-none before:absolute before:inset-0 before:bg-linear-to-br before:from-white/35 before:via-transparent before:to-transparent dark:before:from-white/10",
        dimmed ? cn(ghostTone, "before:hidden") : cn(windowTone[status], "hover:z-10 hover:scale-[1.06]"),
        selected && "z-10 ring-2 ring-foreground ring-offset-1 ring-offset-secondary",
      )}
    >
      {zoom !== "sm" && <span className="num relative max-w-full truncate px-0.5 text-[10px] font-semibold">{number}</span>}
      {zoom === "lg" && unit.total_area && (
        <span dir="ltr" className="num relative mt-0.5 text-[9px] opacity-80">{formatDecimal(unit.total_area, locale, 0)} m²</span>
      )}
    </button>
  );
}
