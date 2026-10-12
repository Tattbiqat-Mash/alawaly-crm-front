"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CheckCircle2,
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
import type { ReactNode } from "react";
import { ErrorState } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import { isSaleStatus, isUnitStatus, saleStatusTone, unitStatusTone } from "@/config/statuses";
import { usePermissions } from "@/features/auth/hooks";
import { Link } from "@/i18n/navigation";
import { toApiError } from "@/lib/api/errors";
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

type WidgetQuery = { allowed: boolean; isLoading: boolean; error: unknown; refetch: () => unknown };

/** 403 (role changed mid-session) hides the widget instead of showing an error. */
const isHidden = (q: WidgetQuery) => !q.allowed || (q.error ? toApiError(q.error).status === 403 : false);

function Card({
  title,
  subtitle,
  children,
  className,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col rounded-xl border border-border/70 bg-card p-3.5 shadow-2xs transition-shadow sm:p-4.5", className)}>
      {title && (
        <div className="mb-3 flex items-center justify-between border-b border-border/50 pb-2.5">
          <h2 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">{title}</h2>
          {subtitle && <span className="text-[11px] font-medium text-muted-foreground/80">{subtitle}</span>}
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
}: {
  icon?: LucideIcon;
  label: string;
  value: ReactNode;
  href?: string;
  loading?: boolean;
}) {
  const isClickable = Boolean(href && !loading);

  if (loading) {
    return (
      <div className="flex min-h-[104px] flex-col justify-between rounded-xl border border-border/70 bg-card/85 p-3.5 shadow-2xs">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="size-7.5 rounded-lg" />
        </div>
        <div className="mt-3">
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
    );
  }

  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground truncate">{label}</span>
        <div className="flex items-center gap-1.5">
          {isClickable && (
            <span
              aria-hidden
              className="grid size-5.5 place-items-center rounded-md bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-105"
            >
              <ArrowUpRight className="size-3 rtl:-scale-x-100" />
            </span>
          )}
          {Icon && (
            <span
              aria-hidden
              className={cn(
                "grid size-7.5 place-items-center rounded-lg ring-1 transition-transform group-hover:scale-105",
                isClickable
                  ? "bg-primary/10 text-primary ring-primary/20"
                  : "bg-muted text-muted-foreground/80 ring-border/50",
              )}
            >
              <Icon className="size-3.5" />
            </span>
          )}
        </div>
      </div>
      <div className="mt-3">
        <span className="num text-2xl font-bold tracking-tight text-foreground sm:text-[1.75rem]">{value}</span>
      </div>
    </>
  );

  const baseClass =
    "group flex min-h-[104px] flex-col justify-between rounded-xl border border-border/70 p-3.5 shadow-2xs transition-all";

  return isClickable ? (
    <Link
      href={href!}
      className={cn(
        baseClass,
        "clickable-widget bg-card hover:border-primary/40 hover:bg-accent/15 hover:shadow-xs focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none",
      )}
    >
      {content}
    </Link>
  ) : (
    <div className={cn(baseClass, "bg-card/90")}>{content}</div>
  );
}

const toneBar: Record<string, string> = {
  neutral: "bg-muted-foreground/50",
  primary: "bg-primary",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
};

function BarsSkeleton() {
  return (
    <div className="space-y-3 py-1">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Lightweight horizontal bars (no chart library on the first load). */
function Bars({
  rows,
}: {
  rows: { key: string; label: string; value: number; tone: string; caption?: string; href?: string }[];
}) {
  const locale = useLocale();
  const max = Math.max(1, ...rows.map((r) => r.value));

  if (rows.length === 0) {
    return <p className="py-6 text-center text-xs text-muted-foreground">—</p>;
  }

  return (
    <ul className="space-y-2.5">
      {rows.map((row) => {
        const percent = Math.round((row.value / max) * 100);
        const isClickable = Boolean(row.href);
        const content = (
          <div
            className={cn(
              "group -mx-1.5 rounded-lg p-1.5 transition-colors",
              isClickable ? "hover:bg-accent/20 cursor-pointer" : "hover:bg-muted/40",
            )}
          >
            <div className="flex items-baseline justify-between gap-2 text-xs sm:text-sm">
              <span
                className={cn(
                  "flex items-center gap-1.5 font-medium transition-colors",
                  isClickable ? "text-foreground/90 group-hover:text-primary" : "text-foreground/90",
                )}
              >
                {row.label}
                {isClickable && (
                  <ArrowUpRight
                    aria-hidden
                    className="size-3 text-muted-foreground/50 transition-transform group-hover:text-primary group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
                  />
                )}
              </span>
              <span className="num text-xs font-semibold text-muted-foreground whitespace-nowrap">
                {formatCount(row.value, locale)}
                {row.caption && <span className="ms-2 font-normal text-muted-foreground/80">{row.caption}</span>}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted/70 ring-1 ring-border/30" aria-hidden>
              <div
                className={cn("h-full rounded-full transition-all duration-500 ease-out", toneBar[row.tone] ?? toneBar.neutral)}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );

        return (
          <li key={row.key}>
            {isClickable ? (
              <Link
                href={row.href!}
                className="block rounded-lg focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
              >
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
    <div
      className={cn(
        "flex items-center gap-3 py-2.5 transition-colors",
        isClickable ? "group/action -mx-1.5 rounded-lg px-1.5 hover:bg-accent/20 cursor-pointer" : "",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-lg ring-1 transition-transform",
          hot
            ? "bg-warning/15 text-warning ring-warning/30 group-hover/action:scale-105"
            : "bg-muted/80 text-muted-foreground ring-border/50",
        )}
      >
        <Icon className="size-4" />
      </span>
      <span
        className={cn(
          "flex-1 text-xs sm:text-sm font-medium transition-colors",
          isClickable ? "text-foreground/90 group-hover/action:text-primary" : "text-foreground/90",
        )}
      >
        {label}
      </span>
      {loading ? (
        <Skeleton className="h-5 w-8" />
      ) : (
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "num inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold",
              hot ? "bg-warning/15 text-warning ring-1 ring-warning/25" : "bg-muted/70 text-muted-foreground",
            )}
          >
            {formatCount(count ?? 0, locale)}
          </span>
          {isClickable && (
            <ArrowUpRight
              aria-hidden
              className="size-3 text-muted-foreground/50 transition-transform group-hover/action:text-primary group-hover/action:translate-x-0.5 rtl:group-hover/action:-translate-x-0.5"
            />
          )}
        </div>
      )}
    </div>
  );

  return (
    <li className="first:pt-0 last:pb-0">
      {isClickable ? (
        <Link
          href={href!}
          className="block rounded-lg focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
        >
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

  return (
    <div className="grid gap-3.5 sm:gap-4">
      {(showInventory || showSales || showService) && (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 xl:grid-cols-5">
          {showInventory && (
            <>
              <Kpi
                icon={Building2}
                label={t("dashboard.kpi.units")}
                value={formatCount(inventory.data?.units_total, locale)}
                href="/units"
                loading={inventory.isLoading}
              />
              <Kpi
                icon={CheckCircle2}
                label={t("dashboard.kpi.available")}
                value={formatCount(inventory.data?.by_status.available ?? 0, locale)}
                href="/units?status=available"
                loading={inventory.isLoading}
              />
            </>
          )}
          {showSales && (
            <>
              <Kpi
                icon={TrendingUp}
                label={t("dashboard.kpi.salesInProgress")}
                value={formatCount(inProgress, locale)}
                href={can("sales.view") ? "/sales" : undefined}
                loading={sales.isLoading}
              />
              <Kpi
                icon={Wallet}
                label={t("dashboard.kpi.collected")}
                value={formatMoney(sales.data?.collected, locale)}
                href={can("finance.view") ? "/payments" : undefined}
                loading={sales.isLoading}
              />
            </>
          )}
          {showService && (
            <Kpi
              icon={Headphones}
              label={t("dashboard.kpi.openRequests")}
              value={formatCount(service.data?.open_requests, locale)}
              loading={service.isLoading}
            />
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
        {showInventory && !inventory.error && (
          <Card title={t("dashboard.charts.unitsByStatus")}>
            {inventory.isLoading ? (
              <BarsSkeleton />
            ) : (
              <Bars
                rows={Object.entries(inventory.data?.by_status ?? {}).map(([status, count]) => ({
                  key: status,
                  label: isUnitStatus(status) ? t(`statuses.unit.${status}`) : status,
                  value: count,
                  tone: isUnitStatus(status) ? unitStatusTone[status] : "neutral",
                  href: `/units?status=${encodeURIComponent(status)}`,
                }))}
              />
            )}
          </Card>
        )}
        {showSales && !sales.error && (
          <Card title={t("dashboard.charts.salesByStatus")}>
            {sales.isLoading ? (
              <BarsSkeleton />
            ) : (
              <Bars
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
          <Card title={t("dashboard.needsAction.title")}>
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
              <div className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-success/20 bg-success/5 py-3 text-xs font-medium text-success">
                <CircleCheck aria-hidden className="size-4 text-success" />
                <span>{t("dashboard.needsAction.allClear")}</span>
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
