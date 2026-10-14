"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  BellRing,
  Building2,
  CircleCheck,
  ClipboardCheck,
  Clock,
  Headphones,
  Plug,
  TrendingUp,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ErrorState } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import { isSaleStatus, isUnitStatus, saleStatusTone, unitStatusTone } from "@/config/statuses";
import { usePermissions } from "@/features/auth/hooks";
import { useProjects } from "@/features/inventory/hooks";
import { Link } from "@/i18n/navigation";
import { toApiError } from "@/lib/api/errors";
import { localizedName } from "@/lib/format/localized";
import { formatCount, formatMoney } from "@/lib/format/money";
import { cn } from "@/lib/utils";
import {
  useFacilitiesSummary,
  useIntegrationHealth,
  useInventorySummary,
  usePendingSecondApprovals,
  useSalesSummary,
  useServiceWorkload,
} from "../hooks";
import type { InventorySummary } from "../types";

type WidgetQuery = { allowed: boolean; isLoading: boolean; error: unknown; refetch: () => unknown };

/** 403 (role changed mid-session) hides the widget instead of showing an error. */
const isHidden = (q: WidgetQuery) => !q.allowed || (q.error ? toApiError(q.error).status === 403 : false);

/** Entrance order: each card starts a beat after the one before it. */
const riseDelay = (step: number) => ({ "--rise-delay": `${step * 70}ms` }) as CSSProperties;

type Tone = "neutral" | "primary" | "info" | "success" | "warning" | "danger" | "sand";

const toneBar: Record<string, string> = {
  neutral: "bg-muted-foreground/50",
  primary: "bg-primary",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
};

const toneStroke: Record<string, string> = {
  neutral: "stroke-muted-foreground/50",
  primary: "stroke-primary",
  info: "stroke-info",
  success: "stroke-success",
  warning: "stroke-warning",
  danger: "stroke-destructive",
};

const toneIcon: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground ring-border/60",
  primary: "bg-primary/10 text-primary ring-primary/20",
  info: "bg-info/10 text-info ring-info/20",
  success: "bg-success/10 text-success ring-success/20",
  warning: "bg-warning/10 text-warning ring-warning/25",
  danger: "bg-destructive/10 text-destructive ring-destructive/20",
  sand: "bg-sand/12 text-sand ring-sand/25",
};

/** Eases a number up to its value (from the last shown value on refetch); instant under reduced motion. */
function useCountUp(target: number, duration = 900) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const tick = (now: number) => {
      const p = reduced ? 1 : Math.min((now - start) / duration, 1);
      const value = p === 1 ? target : origin + (target - origin) * (1 - (1 - p) ** 3);
      from.current = value;
      setShown(value);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return shown;
}

/** A counting number; once it lands, `final` (the exact formatted value) replaces the eased one. */
function CountUp({ value, format, final }: { value: number; format: (v: number) => string; final?: string }) {
  const shown = useCountUp(value);
  return <>{shown === value ? (final ?? format(value)) : format(shown)}</>;
}

function Card({
  title,
  icon: Icon,
  action,
  children,
  className,
  step = 0,
}: {
  title?: ReactNode;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  step?: number;
}) {
  return (
    <section style={riseDelay(step)} className={cn("rise-in flex flex-col rounded-2xl border border-border/70 bg-card p-4 shadow-xs sm:p-5", className)}>
      {title && (
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
            {Icon && (
              <span aria-hidden className="grid size-7 place-items-center rounded-lg bg-muted text-muted-foreground">
                <Icon className="size-3.5" />
              </span>
            )}
            {title}
          </h2>
          {action}
        </div>
      )}
      <div className="flex-1">{children}</div>
    </section>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  href,
  loading,
  tone = "primary",
  featured,
  step = 0,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  href?: string;
  loading?: boolean;
  tone?: Tone;
  /** Wider tile with a larger figure: the number the page leads with. */
  featured?: boolean;
  step?: number;
}) {
  const isClickable = Boolean(href && !loading);
  const baseClass = cn(
    "rise-in group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-xs",
    featured ? "col-span-2 min-h-[132px]" : "min-h-[118px]",
  );

  if (loading) {
    return (
      <div style={riseDelay(step)} className={baseClass}>
        <Skeleton className="size-9 rounded-xl" />
        <div className="mt-4 space-y-2">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className={cn("h-8", featured ? "w-40" : "w-16")} />
        </div>
      </div>
    );
  }

  const content = (
    <>
      {/* Oversized faint icon in the corner: depth without another color. */}
      <Icon aria-hidden className="pointer-events-none absolute -end-5 -top-5 size-24 text-foreground/[0.04] transition-transform duration-500 group-hover:scale-110" />
      <div className="flex items-start justify-between gap-2">
        <span aria-hidden className={cn("grid size-9 place-items-center rounded-xl ring-1", toneIcon[tone])}>
          <Icon className="size-4" />
        </span>
        {isClickable && (
          <ArrowUpRight
            aria-hidden
            className="size-4 text-muted-foreground/0 transition-all group-hover:text-primary rtl:-scale-x-100"
          />
        )}
      </div>
      <div className="relative mt-4">
        <span className="block truncate text-xs font-medium text-muted-foreground">{label}</span>
        <span className={cn("num mt-0.5 block font-bold tracking-tight text-foreground", featured ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl")}>
          {value}
        </span>
      </div>
    </>
  );

  return isClickable ? (
    <Link
      href={href!}
      style={riseDelay(step)}
      className={cn(
        baseClass,
        "transition-[border-color,box-shadow,translate] duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none",
      )}
    >
      {content}
    </Link>
  ) : (
    <div style={riseDelay(step)} className={baseClass}>
      {content}
    </div>
  );
}

/** Ring chart of shares; segments draw in one after another. Decorative: the legend beside it carries the numbers. */
function Donut({ segments, children }: { segments: { key: string; value: number; tone: string }[]; children: ReactNode }) {
  const size = 176;
  const stroke = 18;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const gap = segments.filter((s) => s.value > 0).length > 1 ? 3 : 0;
  let offset = 0;

  return (
    <div className="relative mx-auto shrink-0" style={{ width: size, height: size }}>
      <svg aria-hidden viewBox={`0 0 ${size} ${size}`} className="size-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
        {total > 0 &&
          segments.map((s, i) => {
            const length = (s.value / total) * circumference;
            const dash = Math.max(length - gap, 0);
            const el = (
              <circle
                key={s.key}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                strokeWidth={stroke}
                strokeDashoffset={-offset}
                style={{ strokeDasharray: `${dash} ${circumference}`, "--rise-delay": `${200 + i * 150}ms` } as CSSProperties}
                className={cn("donut-draw", toneStroke[s.tone] ?? toneStroke.neutral)}
              />
            );
            offset += length;
            return el;
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

/** The page's lead card: units by status as a ring with a legend, then availability per project. */
function InventoryHero({ data, loading, className, step }: { data: InventorySummary | undefined; loading: boolean; className?: string; step: number }) {
  const t = useTranslations();
  const locale = useLocale();
  const projects = useProjects();

  if (loading || !data) {
    return (
      <Card className={className} step={step}>
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <Skeleton className="size-44 shrink-0 rounded-full" />
          <div className="w-full space-y-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  const rows = Object.entries(data.by_status)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      key: status,
      label: isUnitStatus(status) ? t(`statuses.unit.${status}`) : status,
      value: count,
      tone: isUnitStatus(status) ? unitStatusTone[status] : "neutral",
    }))
    .sort((a, b) => b.value - a.value);
  const total = data.units_total || rows.reduce((sum, r) => sum + r.value, 0);
  const share = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const available = data.by_status.available ?? 0;
  const projectName = (p: InventorySummary["by_project"][number]) =>
    localizedName(projects.data?.find((x) => x.id === p.id), locale) || localizedName(p, locale) || `#${p.id}`;

  return (
    <Card
      className={cn("relative overflow-hidden", className)}
      step={step}
      icon={Building2}
      title={t("dashboard.hero.title")}
      action={
        <Link href="/units" className="group/link flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          {t("dashboard.hero.viewUnits")}
          <ArrowUpRight aria-hidden className="size-3.5 transition-transform group-hover/link:-translate-y-0.5 rtl:-scale-x-100" />
        </Link>
      }
    >
      {/* Soft brand glow behind the ring */}
      <span aria-hidden className="pointer-events-none absolute -start-16 -top-16 size-64 rounded-full bg-primary/6 blur-3xl" />

      <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
        <Donut segments={rows}>
          <span className="num text-4xl font-bold tracking-tight text-foreground">
            <CountUp value={total} format={(v) => formatCount(Math.round(v), locale)} />
          </span>
          <span className="mt-0.5 text-xs text-muted-foreground">{t("dashboard.hero.total")}</span>
        </Donut>

        <div className="w-full min-w-0 flex-1">
          <ul className="grid grid-cols-[repeat(auto-fit,minmax(6rem,1fr))] gap-2.5">
            {rows.map((row) => (
              <li key={row.key}>
                <Link
                  href={`/units?status=${encodeURIComponent(row.key)}`}
                  className="group/row flex h-full flex-col gap-1 rounded-xl border border-border/70 bg-background/60 p-3 transition-[border-color,box-shadow,translate] hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
                >
                  <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground group-hover/row:text-primary">
                    <span aria-hidden className={cn("size-2 shrink-0 rounded-full", toneBar[row.tone] ?? toneBar.neutral)} />
                    <span className="truncate">{row.label}</span>
                  </span>
                  <span className="num text-2xl font-bold tracking-tight text-foreground">
                    <CountUp value={row.value} format={(v) => formatCount(Math.round(v), locale)} />
                  </span>
                  <span className="num text-[11px] text-muted-foreground">{formatCount(share(row.value), locale)}%</span>
                </Link>
              </li>
            ))}
          </ul>
          {available > 0 && (
            <p className="mt-3 flex items-center gap-2 rounded-lg bg-success/8 px-3 py-2 text-xs font-medium text-success">
              <CircleCheck aria-hidden className="size-4 shrink-0" />
              {t("dashboard.hero.availableShare", { percent: formatCount(share(available), locale) })}
            </p>
          )}
        </div>
      </div>

      {data.by_project.length > 0 && (
        <div className="relative mt-5 border-t border-border/60 pt-4">
          <h3 className="mb-3 text-xs font-semibold text-muted-foreground">{t("dashboard.hero.byProject")}</h3>
          <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {data.by_project.map((p, i) => {
              const free = Number(p.available) || 0;
              const percent = p.units ? Math.round((free / p.units) * 100) : 0;
              return (
                <li key={p.id}>
                  <Link href={`/units?view=plan&project=${p.id}`} className="group/p block rounded-lg focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none">
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="truncate font-semibold text-foreground group-hover/p:text-primary">{projectName(p)}</span>
                      <span className="num shrink-0 text-muted-foreground">
                        {t("dashboard.hero.projectAvailable", { available: formatCount(free, locale), units: formatCount(p.units, locale) })}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                      <div
                        style={{ width: `${percent}%`, "--rise-delay": `${400 + i * 90}ms` } as CSSProperties}
                        className="bar-grow h-full rounded-full bg-linear-to-r from-success/70 to-success rtl:bg-linear-to-l"
                      />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Card>
  );
}

function BarsSkeleton() {
  return (
    <div className="space-y-3 py-1">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-2.5 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Lightweight horizontal bars (no chart library on the first load). */
function Bars({
  rows,
  empty,
}: {
  rows: { key: string; label: string; value: number; tone: string; caption?: string; href?: string }[];
  empty: ReactNode;
}) {
  const locale = useLocale();
  const max = Math.max(1, ...rows.map((r) => r.value));

  if (rows.length === 0) return <>{empty}</>;

  return (
    <ul className="space-y-2">
      {rows.map((row, i) => {
        const percent = Math.round((row.value / max) * 100);
        const isClickable = Boolean(row.href);
        const content = (
          <div className={cn("group -mx-2 rounded-lg px-2 py-1.5 transition-colors", isClickable ? "cursor-pointer hover:bg-muted/60" : "")}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className={cn("flex items-center gap-2 font-medium text-foreground/90 transition-colors", isClickable && "group-hover:text-primary")}>
                <span aria-hidden className={cn("size-2 rounded-full", toneBar[row.tone] ?? toneBar.neutral)} />
                {row.label}
              </span>
              <span className="num text-sm font-bold whitespace-nowrap text-foreground">
                {formatCount(row.value, locale)}
                {row.caption && <span className="ms-2 text-xs font-normal text-muted-foreground">{row.caption}</span>}
              </span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div
                style={{ width: `${percent}%`, "--rise-delay": `${250 + i * 90}ms` } as CSSProperties}
                className={cn("bar-grow h-full rounded-full", toneBar[row.tone] ?? toneBar.neutral)}
              />
            </div>
          </div>
        );

        return (
          <li key={row.key}>
            {isClickable ? (
              <Link href={row.href!} className="block rounded-lg focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none">
                {content}
              </Link>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Empty chart: a calm illustration instead of a bare dash. */
function ChartEmpty({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex h-full min-h-40 flex-col items-center justify-center gap-3 text-center">
      <span aria-hidden className="relative grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground/70">
        <span className="absolute inset-0 rounded-2xl ring-1 ring-border" />
        <Icon className="size-6" />
      </span>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function ActionRow({
  icon: Icon,
  label,
  count,
  loading,
  href,
}: {
  icon: LucideIcon;
  label: string;
  count: number | undefined;
  loading: boolean;
  href?: string;
}) {
  const locale = useLocale();
  const hot = (count ?? 0) > 0;
  const isClickable = Boolean(href && !loading && hot);

  const rowContent = (
    <div className={cn("flex items-center gap-3 py-2.5 transition-colors", isClickable && "group/action -mx-2 cursor-pointer rounded-lg px-2 hover:bg-muted/60")}>
      <span
        aria-hidden
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-lg ring-1 transition-transform",
          hot ? "bg-warning/12 text-warning ring-warning/30 group-hover/action:scale-105" : "bg-muted/80 text-muted-foreground/70 ring-border/50",
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className={cn("flex-1 text-sm transition-colors", hot ? "font-medium text-foreground" : "text-muted-foreground", isClickable && "group-hover/action:text-primary")}>
        {label}
      </span>
      {loading ? (
        <Skeleton className="h-5 w-8" />
      ) : (
        <span
          className={cn(
            "num inline-flex min-w-7 items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold",
            hot ? "bg-warning text-white dark:text-background" : "bg-muted text-muted-foreground",
          )}
        >
          {formatCount(count ?? 0, locale)}
        </span>
      )}
    </div>
  );

  return (
    <li className="first:pt-0 last:pb-0">
      {isClickable ? (
        <Link href={href!} className="block rounded-lg focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none">
          {rowContent}
        </Link>
      ) : (
        rowContent
      )}
    </li>
  );
}

// S02 — Dashboard.
export function Dashboard() {
  const t = useTranslations();
  const locale = useLocale();
  const { can } = usePermissions();

  const inventory = useInventorySummary();
  const sales = useSalesSummary();
  const service = useServiceWorkload();
  const facilities = useFacilitiesSummary();
  const integrations = useIntegrationHealth();
  const approvals = usePendingSecondApprovals();

  const showInventory = !isHidden(inventory);
  const showSales = !isHidden(sales);
  const showService = !isHidden(service);
  const actionWidgets = [approvals, service, facilities, integrations].filter((q) => !isHidden(q));
  const nothingToShow = !showInventory && !showSales && !showService && actionWidgets.length === 0;

  const inProgress = (sales.data?.sales_by_status ?? [])
    .filter((s) => s.status === "draft" || s.status === "contracted")
    .reduce((n, s) => n + s.count, 0);

  if (nothingToShow && [inventory, sales, service, facilities, integrations, approvals].every((q) => !q.isLoading)) {
    return (
      <Card>
        <p className="py-8 text-center text-sm text-muted-foreground">{t("dashboard.noWidgets")}</p>
      </Card>
    );
  }

  const actionsLoading = actionWidgets.some((q) => q.isLoading);
  const actionTotal =
    (approvals.data ?? 0) +
    (service.data?.sla_breached ?? 0) +
    (facilities.data?.tasks_overdue ?? 0) +
    (integrations.data?.dead ?? 0);
  const collected = Number(sales.data?.collected ?? 0) || 0;
  const showKpis = showSales || showService;

  return (
    <div className="grid gap-4">
      {(showInventory || showKpis) && (
        <div className="grid gap-4 lg:grid-cols-3">
          {showInventory && !inventory.error && (
            <InventoryHero data={inventory.data} loading={inventory.isLoading} className="lg:col-span-2" step={0} />
          )}
          {showKpis && (
            // Beside the hero the tiles stretch to its height; alone they form one row.
            <div className={cn("grid gap-3", showInventory ? "grid-cols-2" : "grid-cols-2 content-start md:grid-cols-4 lg:col-span-3")}>
              {showSales && (
                <>
                  <Kpi
                    featured
                    icon={Wallet}
                    tone="sand"
                    label={t("dashboard.kpi.collected")}
                    value={<CountUp value={collected} format={(v) => formatMoney(v.toFixed(2), locale)} final={formatMoney(sales.data?.collected, locale)} />}
                    href={can("finance.view") ? "/payments" : undefined}
                    loading={sales.isLoading}
                    step={1}
                  />
                  <Kpi
                    icon={TrendingUp}
                    tone="info"
                    label={t("dashboard.kpi.salesInProgress")}
                    value={<CountUp value={inProgress} format={(v) => formatCount(Math.round(v), locale)} />}
                    href={can("sales.view") ? "/sales" : undefined}
                    loading={sales.isLoading}
                    step={2}
                  />
                </>
              )}
              {showService && (
                <Kpi
                  icon={Headphones}
                  tone="primary"
                  label={t("dashboard.kpi.openRequests")}
                  value={<CountUp value={service.data?.open_requests ?? 0} format={(v) => formatCount(Math.round(v), locale)} />}
                  loading={service.isLoading}
                  step={3}
                />
              )}
            </div>
          )}
        </div>
      )}

      {(inventory.error || sales.error) && (showInventory || showSales) ? (
        <Card>
          <ErrorState
            compact
            error={inventory.error ?? sales.error}
            onRetry={() => {
              inventory.refetch();
              sales.refetch();
            }}
          />
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {showSales && !sales.error && (
          <Card title={t("dashboard.charts.salesByStatus")} icon={TrendingUp} className="lg:col-span-2" step={4}>
            {sales.isLoading ? (
              <BarsSkeleton />
            ) : (
              <Bars
                empty={<ChartEmpty icon={TrendingUp} text={t("dashboard.charts.salesEmpty")} />}
                rows={(sales.data?.sales_by_status ?? []).map((s) => ({
                  key: s.status,
                  label: isSaleStatus(s.status) ? t(`statuses.sale.${s.status}`) : s.status,
                  value: s.count,
                  tone: isSaleStatus(s.status) ? saleStatusTone[s.status] : "neutral",
                  caption: formatMoney(s.value, locale),
                  href: can("sales.view") ? `/sales?status=${encodeURIComponent(s.status)}` : undefined,
                }))}
              />
            )}
          </Card>
        )}
        {actionWidgets.length > 0 && (
          <Card
            title={t("dashboard.needsAction.title")}
            icon={BellRing}
            step={5}
            className={cn(!actionsLoading && actionTotal > 0 && "border-t-2 border-t-warning")}
            action={
              !actionsLoading && actionTotal > 0 ? (
                <span className="num rounded-full bg-warning/12 px-2 py-0.5 text-xs font-bold text-warning">{formatCount(actionTotal, locale)}</span>
              ) : undefined
            }
          >
            <ul className="divide-y divide-border/60">
              {!isHidden(approvals) && (
                <ActionRow
                  icon={ClipboardCheck}
                  label={t("dashboard.needsAction.secondApprovals")}
                  count={approvals.data}
                  loading={approvals.isLoading}
                  href={can("finance.confirm") || can("finance.confirm.second") || can("finance.view") ? "/payments/confirmations" : undefined}
                />
              )}
              {!isHidden(service) && (
                <ActionRow icon={Clock} label={t("dashboard.needsAction.slaBreached")} count={service.data?.sla_breached} loading={service.isLoading} />
              )}
              {!isHidden(facilities) && (
                <ActionRow icon={Wrench} label={t("dashboard.needsAction.overdueMaintenance")} count={facilities.data?.tasks_overdue} loading={facilities.isLoading} />
              )}
              {!isHidden(integrations) && (
                <ActionRow icon={Plug} label={t("dashboard.needsAction.deadEvents")} count={integrations.data?.dead} loading={integrations.isLoading} />
              )}
            </ul>
            {!actionsLoading && actionTotal === 0 && (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-success/20 bg-linear-to-br from-success/10 to-success/3 px-3.5 py-3">
                <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-success/15 text-success ring-4 ring-success/5">
                  <CircleCheck className="size-5" />
                </span>
                <span className="text-sm font-medium text-success">{t("dashboard.needsAction.allClear")}</span>
              </div>
            )}
            {actionWidgets.some((q) => q.error && !isHidden(q)) && (
              <p className="mt-2.5 flex items-center gap-2 text-xs text-destructive">
                <AlertTriangle aria-hidden className="size-3.5" />
                <span>{t("errors.generic")}</span>
              </p>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
