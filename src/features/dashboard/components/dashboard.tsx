"use client";

import {
  AlertTriangle,
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

function Card({ title, children, className }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border bg-card p-4.5 shadow-2xs transition-shadow md:p-5", className)}>
      {title && <h2 className="mb-3.5 text-sm font-semibold tracking-tight text-foreground">{title}</h2>}
      {children}
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
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {Icon && (
          <span
            aria-hidden
            className="grid size-7.5 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20 transition-transform group-hover:scale-105"
          >
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <div className="mt-3">
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <span className="num text-2xl font-bold tracking-tight text-foreground">{value}</span>
        )}
      </div>
    </>
  );
  const cls =
    "group flex min-h-26 flex-col justify-between rounded-xl border bg-card p-4 shadow-2xs transition-all hover:border-primary/30 hover:shadow-xs";
  return href && !loading ? (
    <Link
      href={href}
      className={cn(
        cls,
        "focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none hover:bg-accent/25",
      )}
    >
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

const toneBar: Record<string, string> = {
  neutral: "bg-muted-foreground/60",
  primary: "bg-primary",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
};

/** Lightweight horizontal bars (no chart library on the first load). */
function Bars({ rows }: { rows: { key: string; label: string; value: number; tone: string; caption?: string; href?: string }[] }) {
  const locale = useLocale();
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3">
      {rows.map((row) => {
        const percent = Math.round((row.value / max) * 100);
        const content = (
          <div className="group -mx-2 rounded-lg p-2 transition-colors hover:bg-muted/50">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-medium text-foreground/90">{row.label}</span>
              <span className="num text-xs font-semibold text-muted-foreground">
                {formatCount(row.value, locale)}
                {row.caption && <span className="ms-2 font-normal text-muted-foreground/80">{row.caption}</span>}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div
                className={cn("h-full rounded-full transition-all duration-300", toneBar[row.tone])}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
        return (
          <li key={row.key}>
            {row.href ? (
              <Link href={row.href} className="block rounded-lg focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none">
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

function ActionRow({ icon: Icon, label, count, loading }: { icon: LucideIcon; label: string; count: number | undefined; loading: boolean }) {
  const locale = useLocale();
  const hot = (count ?? 0) > 0;
  return (
    <li className="flex items-center gap-3 py-3 first:pt-1 last:pb-1">
      <span
        aria-hidden
        className={cn(
          "grid size-8.5 place-items-center rounded-lg ring-1 transition-colors",
          hot ? "bg-warning/15 text-warning ring-warning/30" : "bg-muted/80 text-muted-foreground ring-border/50",
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="flex-1 text-sm font-medium text-foreground/90">{label}</span>
      {loading ? (
        <Skeleton className="h-5 w-8" />
      ) : (
        <span
          className={cn(
            "num inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold",
            hot ? "bg-warning/15 text-warning" : "text-muted-foreground",
          )}
        >
          {formatCount(count ?? 0, locale)}
        </span>
      )}
    </li>
  );
}

// S02 — Dashboard.
export function Dashboard() {
  const t = useTranslations();
  const locale = useLocale();
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
    <div className="grid gap-5">
      {(showInventory || showSales || showService) && (
        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-5">
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
                loading={sales.isLoading}
              />
              <Kpi
                icon={Wallet}
                label={t("dashboard.kpi.collected")}
                value={formatMoney(sales.data?.collected, locale)}
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
              <Skeleton className="h-32 w-full" />
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
              <Skeleton className="h-32 w-full" />
            ) : (
              <Bars
                rows={(sales.data?.sales_by_status ?? []).map((s) => ({
                  key: s.status,
                  label: isSaleStatus(s.status) ? t(`statuses.sale.${s.status}`) : s.status,
                  value: s.count,
                  tone: isSaleStatus(s.status) ? saleStatusTone[s.status] : "neutral",
                  caption: formatMoney(s.value, locale),
                }))}
              />
            )}
          </Card>
        )}
        {actionWidgets.length > 0 && (
          <Card title={t("dashboard.needsAction.title")}>
            <ul className="divide-y">
              {!isHidden(approvals) && (
                <ActionRow icon={ClipboardCheck} label={t("dashboard.needsAction.secondApprovals")} count={approvals.data} loading={approvals.isLoading} />
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
              <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <CircleCheck aria-hidden className="size-3.5 text-success" />
                {t("dashboard.needsAction.allClear")}
              </p>
            )}
            {actionWidgets.some((q) => q.error && !isHidden(q)) && (
              <p className="mt-2 flex items-center gap-2 text-xs text-destructive">
                <AlertTriangle aria-hidden className="size-3.5" />
                {t("errors.generic")}
              </p>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

