"use client";

import { ArrowRight, Building2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, type ReactNode } from "react";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCount } from "@/lib/format/money";
import { isOn, localizedName } from "@/lib/format/localized";
import { cn } from "@/lib/utils";
import { useBuildings, useProjects } from "../../hooks";
import type { Building, Project } from "../../types";

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
const byOrder = (a: Project, b: Project) =>
  (a.display_order ?? Number.MAX_SAFE_INTEGER) - (b.display_order ?? Number.MAX_SAFE_INTEGER) || a.id - b.id;

// Skyline geometry (SVG user units).
const W = 220;
const GROUND = 96;
const GAP = 6;
const MAX_DRAWN = 7;

/** A small elevation of the project's real buildings: count, order and height from the lookups. */
function Skyline({ buildings }: { buildings: Building[] }) {
  const shown = [...buildings].sort((a, b) => collator.compare(a.building_code ?? "", b.building_code ?? "")).slice(0, MAX_DRAWN);
  const n = Math.max(shown.length, 1);
  const width = Math.min(40, (W - 32 - GAP * (n - 1)) / n);
  const x0 = (W - (n * width + GAP * (n - 1))) / 2;

  return (
    <svg aria-hidden viewBox={`0 0 ${W} 104`} preserveAspectRatio="xMidYMax meet" className="h-full w-full overflow-visible">
      <rect x={0} y={GROUND} width={W} height={8} className="fill-foreground/6" />
      <line x1={0} x2={W} y1={GROUND} y2={GROUND} strokeWidth={1} className="stroke-foreground/15" />
      {shown.length === 0 && (
        <rect x={W / 2 - 18} y={GROUND - 36} width={36} height={36} rx={2} strokeDasharray="3 3" className="fill-none stroke-foreground/25" />
      )}
      {/* Trees at both ends of the street */}
      {[x0 - 12, W - x0 + 12].map((cx) => (
        <g key={cx}>
          <line x1={cx} x2={cx} y1={GROUND} y2={GROUND - 6} strokeWidth={1} className="stroke-foreground/25" />
          <circle cx={cx} cy={GROUND - 10} r={6} className="fill-success/35" />
        </g>
      ))}
      <g className="transition-transform duration-300 ease-out group-hover:-translate-y-1">
        {shown.map((b, i) => {
          const floors = Math.min(Math.max(b.floors_count ?? 3, 1), 14);
          const height = 10 + floors * 6;
          const x = x0 + i * (width + GAP);
          const top = GROUND - height;
          return (
            <g key={b.id}>
              {/* Side wall in perspective */}
              <path d={`M${x + width} ${top} l3 -3 v${height} l-3 3 z`} className="fill-foreground/12" />
              <rect x={x - 1} y={top - 1.5} width={width + 2} height={2} rx={0.5} className="fill-foreground/30" />
              <rect x={x} y={top} width={width} height={height} rx={1} strokeWidth={0.75} className="fill-card stroke-foreground/20" />
              {/* One dashed stroke per floor = a row of windows; a few lit warm, the rest glass. */}
              {Array.from({ length: floors }, (_, f) => (
                <line
                  key={f}
                  x1={x + 3}
                  x2={x + width - 3}
                  y1={top + 6 + f * 6}
                  y2={top + 6 + f * 6}
                  strokeWidth={3}
                  strokeDasharray="3.5 2"
                  className={(f + i) % 3 === 0 ? "stroke-sand/55" : "stroke-primary/45"}
                />
              ))}
              <rect x={x + width / 2 - 2.5} y={GROUND - 4} width={5} height={4} className="fill-sand/40" />
            </g>
          );
        })}
      </g>
    </svg>
  );
}

type Props = {
  /** Units each project has among the filter matches; null when no narrowing filter is set. */
  matchesByProject: Map<number, number> | null;
  onOpen: (projectId: number) => void;
  /** Controls beside the heading (the plan's full-screen toggle). */
  action?: ReactNode;
};

/** Site plan entry point: pick a project. Every filter above still applies once inside. */
export function ProjectGallery({ matchesByProject, onOpen, action }: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const projects = useProjects();
  const buildings = useBuildings();

  const buildingsByProject = useMemo(() => {
    const map = new Map<number, Building[]>();
    for (const b of buildings.data ?? []) {
      if (b.project_id !== null) map.set(b.project_id, [...(map.get(b.project_id) ?? []), b]);
    }
    return map;
  }, [buildings.data]);

  if (projects.error) return <ErrorState error={projects.error} onRetry={() => projects.refetch()} compact />;

  const list = [...(projects.data ?? [])].sort(byOrder);
  const matchedTotal = matchesByProject ? [...matchesByProject.values()].reduce((a, b) => a + b, 0) : null;

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">{t("units.plan.chooseProject")}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("units.plan.chooseProjectHint")}</p>
        </div>
        <div className="flex items-center gap-2">
          {matchedTotal !== null && (
            <StatusBadge tone="primary" pulse={false}>
              {t("units.plan.matchingUnits", { count: formatCount(matchedTotal, locale) })}
            </StatusBadge>
          )}
          {action && <div className="flex items-center rounded-lg border bg-muted/60 p-0.5">{action}</div>}
        </div>
      </div>

      {projects.isLoading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState compact icon={Building2} title={t("units.plan.noProjects")} />
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3">
          {list.map((project) => {
            const projectBuildings = buildingsByProject.get(project.id) ?? [];
            const matched = matchesByProject ? (matchesByProject.get(project.id) ?? 0) : null;
            const progress = project.developing_percentage;
            return (
              <li key={project.id}>
                <button
                  type="button"
                  onClick={() => onOpen(project.id)}
                  className={cn(
                    "group flex h-full w-full flex-col overflow-hidden rounded-2xl border bg-card text-start shadow-xs outline-none",
                    "transition-[border-color,box-shadow,transform,opacity] duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg",
                    "focus-visible:ring-3 focus-visible:ring-ring/50",
                    matched === 0 && "opacity-60 hover:opacity-100",
                  )}
                >
                  <div className="site-sky relative h-36 overflow-hidden px-3 pt-3">
                    {/* Sun (moon in dark mode) */}
                    <span
                      aria-hidden
                      className="absolute end-6 top-4 size-8 rounded-full bg-sand-border shadow-[0_0_24px_8px_var(--sand-border)] transition-transform duration-500 group-hover:-translate-y-1 dark:bg-foreground/15 dark:shadow-[0_0_20px_4px_color-mix(in_oklch,var(--foreground)_8%,transparent)]"
                    />
                    <Skyline buildings={projectBuildings} />
                    {matched !== null && (
                      <span
                        className={cn(
                          "num absolute end-2.5 top-2.5 rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-2xs",
                          matched > 0 ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground",
                        )}
                      >
                        {t("units.plan.matching", { count: formatCount(matched, locale) })}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 border-t p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="line-clamp-2 text-base font-bold tracking-tight text-foreground">
                        {localizedName(project, locale) || `#${project.id}`}
                      </span>
                      {!isOn(project.active) && <StatusBadge>{t("common.inactive")}</StatusBadge>}
                    </div>
                    <span className="num text-xs text-muted-foreground">
                      {t("units.plan.buildings", { count: projectBuildings.length })}
                    </span>
                    {typeof progress === "number" && (
                      <div className="flex flex-col gap-1">
                        <span className="num text-[11px] font-medium text-muted-foreground">{t("units.plan.developing", { percent: progress })}</span>
                        <span aria-hidden className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <span
                            className="block h-full rounded-full bg-linear-to-r from-sand/70 to-sand rtl:bg-linear-to-l"
                            style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
                          />
                        </span>
                      </div>
                    )}
                    <span className="mt-auto flex items-center gap-1 pt-1 text-xs font-medium text-primary">
                      {t("units.plan.openPlan")}
                      <ArrowRight aria-hidden className="size-3.5 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
