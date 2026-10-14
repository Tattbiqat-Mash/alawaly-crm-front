"use client";

import { ArrowLeft, Building2, Maximize2, Minimize2, TriangleAlert, X, ZoomIn, ZoomOut } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState, type ReactNode, type SyntheticEvent } from "react";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCount } from "@/lib/format/money";
import { cn } from "@/lib/utils";
import { usePrefetchUnit, useSitePlanUnits, type UnitsListState } from "../../hooks";
import { buildSitePlan, countByStatus, type StatusCounts } from "../../site-plan";
import type { UnitListItem } from "../../types";
import { useInventoryLookups } from "../use-lookups";
import { BuildingElevation, PLAN_ZOOMS, zoomStyle, type PlanZoom } from "./building-elevation";
import { ProjectGallery } from "./project-gallery";
import { StatusBar } from "./status-bar";
import { PLAN_STATUS_ORDER, swatchTone } from "./unit-tone";
import { UnitPeek, type Peek } from "./unit-peek";

type SetState = (patch: Partial<UnitsListState>) => void;

type Props = {
  state: UnitsListState;
  setState: SetState;
  selectedId: number | null;
  onSelect: (unit: UnitListItem) => void;
};

/**
 * Full screen for showing the plan to clients. The whole page goes full screen and the plan covers it,
 * rather than the plan element itself: the unit sheet portals to <body>, and would be invisible outside
 * a full-screen element. Leaving by Esc or the browser's own controls is followed via `fullscreenchange`.
 */
function useFullscreenPlan() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (!on) return;
    const onChange = () => {
      if (!document.fullscreenElement) setOn(false);
    };
    // Browsers without the Fullscreen API (iPhone Safari) still get the covering plan; Esc leaves it there.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.fullscreenElement && !document.querySelector("[role=dialog]")) setOn(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("keydown", onKey);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    };
  }, [on]);

  const toggle = useCallback(() => {
    if (on) {
      setOn(false);
      return;
    }
    setOn(true);
    void document.documentElement.requestFullscreen?.().catch(() => {});
  }, [on]);

  return { on, toggle };
}

function FullscreenButton({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  const t = useTranslations("units.plan");
  const label = on ? t("exitFullscreen") : t("fullscreen");
  return (
    <Button variant="ghost" size="icon-xs" onClick={onToggle} aria-label={label} title={label} aria-pressed={on}>
      {on ? <Minimize2 /> : <Maximize2 />}
    </Button>
  );
}

/**
 * S03 site plan: the units list drawn as buildings. Without a project it offers the projects;
 * inside one it draws every building floor by floor and lights the units the filters keep.
 */
export function UnitsSitePlan({ state, setState, selectedId, onSelect }: Props) {
  const plan = useSitePlanUnits(state);
  const inProject = state.project !== null || state.building !== null;
  const fullscreen = useFullscreenPlan();
  const fullscreenButton = <FullscreenButton on={fullscreen.on} onToggle={fullscreen.toggle} />;

  const matchesByProject = useMemo(() => {
    if (!plan.narrowed || !plan.match.data) return null;
    const map = new Map<number, number>();
    for (const u of plan.match.data.items) if (u.project_id !== null) map.set(u.project_id, (map.get(u.project_id) ?? 0) + 1);
    return map;
  }, [plan.narrowed, plan.match.data]);

  const busy = plan.scope.isFetching || plan.match.isFetching;

  return (
    <div
      className={cn(
        "flex min-h-[380px] flex-1 flex-col overflow-hidden bg-card",
        // Full screen: above the sidebar and header, below dialogs and sheets (z-50).
        fullscreen.on ? "fixed inset-0 z-40" : "relative rounded-xl border shadow-2xs",
      )}
      aria-busy={busy}
    >
      {busy && (
        <div aria-hidden className="absolute inset-x-0 top-0 z-20 h-0.5 overflow-hidden bg-primary/10">
          <div className="h-full w-1/3 animate-[progress_1s_ease-in-out_infinite] bg-primary" />
        </div>
      )}
      {inProject ? (
        <ProjectScene state={state} setState={setState} data={plan} selectedId={selectedId} onSelect={onSelect} toolbar={fullscreenButton} />
      ) : (
        <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
          <ProjectGallery
            matchesByProject={matchesByProject}
            onOpen={(id) => setState({ project: String(id), building: null, page: 1 })}
            action={fullscreenButton}
          />
        </div>
      )}
    </div>
  );
}

function ProjectScene({
  state,
  setState,
  data,
  selectedId,
  onSelect,
  toolbar,
}: Props & { data: ReturnType<typeof useSitePlanUnits>; toolbar: ReactNode }) {
  const t = useTranslations();
  const locale = useLocale();
  const lookups = useInventoryLookups();
  const prefetchUnit = usePrefetchUnit();
  const [zoom, setZoom] = useState<PlanZoom>("md");
  const [peek, setPeek] = useState<Peek | null>(null);
  const { scope, matches } = data;

  const focused = state.building ? lookups.buildings.find((b) => String(b.id) === state.building) : undefined;
  const projectId = state.project ?? (focused && focused.project_id !== null ? String(focused.project_id) : null);

  const scopeBuildings = useMemo(
    () => lookups.buildings.filter((b) => (state.building ? String(b.id) === state.building : String(b.project_id) === projectId)),
    [lookups.buildings, state.building, projectId],
  );
  const units = scope.data?.items;
  const buildings = useMemo(() => buildSitePlan(units ?? [], scopeBuildings), [units, scopeBuildings]);
  const unitsById = useMemo(() => new Map((units ?? []).map((u) => [u.id, u])), [units]);
  const counts = useMemo(() => countByStatus(units ?? []), [units]);
  const matchedInScope = matches ? (units ?? []).filter((u) => matches.has(u.id)).length : null;

  const focusBuilding = useCallback((id: number) => setState({ building: String(id), page: 1 }), [setState]);

  // One set of handlers for every window (event delegation keeps hover cheap on large projects).
  const hit = (e: SyntheticEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-unit-id]");
    const unit = el ? unitsById.get(Number(el.dataset.unitId)) : undefined;
    return el && unit ? { el, unit } : null;
  };
  const showPeek = (e: SyntheticEvent) => {
    const target = hit(e);
    if (!target) return setPeek(null);
    prefetchUnit(target.unit.id);
    setPeek((prev) => (prev?.unit.id === target.unit.id ? prev : { unit: target.unit, rect: target.el.getBoundingClientRect() }));
  };
  const hidePeek = () => setPeek(null);

  const zoomIndex = PLAN_ZOOMS.indexOf(zoom);
  const projectName = lookups.projectName(projectId === null ? null : Number(projectId));

  return (
    <>
      {/* One slim row: back to projects, project and building, size of the scope, status key, zoom */}
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 border-b px-2 py-1 sm:px-3">
        <Button
          variant="ghost"
          size="xs"
          className="text-muted-foreground max-sm:w-6 max-sm:px-0!"
          title={t("units.plan.allProjects")}
          onClick={() => setState({ project: null, building: null, page: 1 })}
        >
          <ArrowLeft data-icon="inline-start" className="rtl:rotate-180" />
          <span className="max-sm:sr-only">{t("units.plan.allProjects")}</span>
        </Button>
        <span aria-hidden className="h-4 w-px bg-border" />
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <h2 className="truncate text-xs font-semibold tracking-tight text-foreground">{projectName || t("units.plan.noProjectName")}</h2>
          {focused && (
            <button
              type="button"
              onClick={() => setState({ building: null, page: 1 })}
              aria-label={t("units.plan.showAllBuildings")}
              className="inline-flex h-5 items-center gap-1 rounded-full border border-primary/30 bg-primary/10 ps-2 pe-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/15"
            >
              {lookups.buildingName(focused.id)}
              <X aria-hidden className="size-3" />
            </button>
          )}
          {units && (
            <span className="num text-[11px] text-muted-foreground max-sm:hidden">
              {!focused && <>{t("units.plan.buildings", { count: buildings.filter((b) => b.id !== null).length })} · </>}
              {t("units.plan.units", { count: scope.data?.total ?? units.length })}
            </span>
          )}
        </div>
        {units && units.length > 0 && (
          <>
            <span aria-hidden className="h-4 w-px bg-border max-sm:hidden" />
            <Legend
              counts={counts}
              active={state.status}
              onToggle={(status) => setState({ status: state.status === status ? null : status, page: 1 })}
              summary={
                matchedInScope !== null
                  ? t("units.plan.matchSummary", { matched: formatCount(matchedInScope, locale), total: formatCount(units.length, locale) })
                  : null
              }
            />
          </>
        )}
        <div className="ms-auto flex items-center gap-1.5">
          <div className="flex items-center gap-0.5 rounded-lg border bg-muted/60 p-0.5" role="group" aria-label={t("units.plan.zoom")}>
            <Button variant="ghost" size="icon-xs" disabled={zoomIndex === 0} onClick={() => setZoom(PLAN_ZOOMS[zoomIndex - 1])} aria-label={t("units.plan.zoomOut")}>
              <ZoomOut />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={zoomIndex === PLAN_ZOOMS.length - 1}
              onClick={() => setZoom(PLAN_ZOOMS[zoomIndex + 1])}
              aria-label={t("units.plan.zoomIn")}
            >
              <ZoomIn />
            </Button>
          </div>
          <div className="flex items-center rounded-lg border bg-muted/60 p-0.5">{toolbar}</div>
        </div>
      </div>

      <div
        className="site-sky relative min-h-0 flex-1 overflow-auto overscroll-contain"
        style={zoomStyle[zoom]}
        onPointerOver={showPeek}
        onPointerLeave={hidePeek}
        onFocus={showPeek}
        onBlur={hidePeek}
        onScroll={hidePeek}
        onClick={(e) => {
          const target = hit(e);
          if (!target) return;
          hidePeek();
          onSelect(target.unit);
        }}
      >
        {scope.data?.truncated && (
          <p role="status" className="sticky start-0 top-0 z-10 flex items-center gap-2 border-b border-warning/25 bg-warning/10 px-4 py-2 text-xs text-warning">
            <TriangleAlert aria-hidden className="size-3.5 shrink-0" />
            {t("units.plan.truncated", { shown: formatCount(units?.length, locale), total: formatCount(scope.data.total, locale) })}
          </p>
        )}
        {scope.isLoading ? (
          <PlanSkeleton />
        ) : scope.error ? (
          <div className="p-6">
            <ErrorState error={scope.error} onRetry={() => scope.refetch()} compact />
          </div>
        ) : buildings.length === 0 ? (
          <div className="flex min-h-full items-center justify-center p-6">
            <EmptyState compact icon={Building2} title={t("units.plan.noBuildings")} />
          </div>
        ) : (
          <div
            role="region"
            aria-label={t("units.plan.stage", { project: projectName })}
            className="flex min-h-full flex-wrap items-end justify-center-safe gap-x-1 gap-y-12 px-2 pt-6 pb-8 sm:gap-x-5 sm:gap-y-16 sm:px-6 sm:pt-10 sm:pb-12"
          >
            {buildings.map((b, i) => (
              <BuildingElevation
                key={b.id ?? "none"}
                plan={b}
                title={b.id === null ? t("units.plan.noBuilding") : lookups.buildingName(b.id)}
                zoom={zoom}
                index={i}
                matches={matches}
                selectedId={selectedId}
                onFocusBuilding={focused ? undefined : focusBuilding}
              />
            ))}
          </div>
        )}
      </div>
      <UnitPeek peek={peek} />
    </>
  );
}

/** Status key with counts, inline in the scene's top row; each entry also toggles the status filter. */
function Legend({
  counts,
  active,
  onToggle,
  summary,
}: {
  counts: StatusCounts;
  active: string | null;
  onToggle: (status: string) => void;
  summary: string | null;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const shown = PLAN_STATUS_ORDER.filter((s) => counts[s] > 0 || s === active);

  return (
    // Phones: its own swipeable line under the title row, edge to edge.
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 max-sm:order-last max-sm:-mx-2 max-sm:w-[calc(100%+1rem)] max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:px-2 max-sm:pb-0.5 max-sm:[scrollbar-width:none] max-sm:*:shrink-0 max-sm:[&::-webkit-scrollbar]:hidden">
      <StatusBar counts={counts} className="h-1 w-16 shrink-0" />
      <ul className="flex flex-wrap items-center gap-1 max-sm:flex-nowrap max-sm:*:shrink-0" aria-label={t("units.plan.legend")}>
        {shown.map((status) => {
          const label = t(`statuses.unit.${status}`);
          const content = (
            <>
              <span aria-hidden className={cn("size-1.5 rounded-full", swatchTone[status])} />
              {label}
              <span className="num font-semibold text-foreground">{formatCount(counts[status], locale)}</span>
            </>
          );
          const chip = "inline-flex h-5 items-center gap-1 rounded-full border px-2 text-[11px] text-muted-foreground";
          return (
            <li key={status}>
              {status === "unknown" ? (
                <span className={chip}>{content}</span>
              ) : (
                <button
                  type="button"
                  aria-pressed={active === status}
                  onClick={() => onToggle(status)}
                  className={cn(
                    chip,
                    "bg-background outline-none transition-colors hover:border-primary/40 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                    active === status && "border-primary/50 bg-primary/10 text-foreground",
                  )}
                >
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {summary && <span className="num text-[11px] font-medium text-primary">{summary}</span>}
    </div>
  );
}

function PlanSkeleton() {
  return (
    <div aria-hidden className="flex min-h-full items-end justify-center-safe gap-6 overflow-hidden px-4 pt-5 pb-6 sm:gap-12 sm:px-8 sm:pt-8 sm:pb-10">
      {["h-56", "h-80", "h-64"].map((h, i) => (
        <div key={i} className="flex flex-col items-center gap-3">
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className={cn("w-44 rounded-t-md rounded-b-none", h)} />
        </div>
      ))}
    </div>
  );
}
