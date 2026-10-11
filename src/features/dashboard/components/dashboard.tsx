"use client";

import { AlertTriangle, CircleCheck, ClipboardCheck, Clock, Plug, Wrench, type LucideIcon } from "lucide-react";
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
    <section className={cn("rounded-xl border bg-card p-4", className)}>
      {title && <h2 className="mb-3 text-sm font-medium">{title}</h2>}
      {children}
    </section>
  );
}

function Kpi({ label, value, href, loading }: { label: string; value: ReactNode; href?: string; loading?: boolean }) {
  const body = (
    <>
      <span className="text-xs text-muted-foreground">{label}</span>
      {loading ? <Skeleton className="mt-2 h-7 w-20" /> : <span className="num mt-1 text-2xl font-semibold">{value}</span>}
    </>
  );
  const cls = "flex min-h-24 flex-col justify-between rounded-xl border bg-card p-4";
  return href && !loading ? (
    <Link href={href} className={cn(cls, "transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
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

/** Lightweight horizontal bars (no chart library on the first load). */
function Bars({ rows }: { rows: { key: string; label: string; value: number; tone: string; caption?: string; href?: string }[] }) {
  const locale = useLocale();
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2.5">
      {rows.map((row) => {
        const content = (
          <>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span>{row.label}</span>
              <span className="num text-muted-foreground">
                {formatCount(row.value, locale)}
                {row.caption && <span className="ms-2 text-xs">{row.caption}</span>}
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div className={cn("h-full rounded-full", toneBar[row.tone])} style={{ width: `${(row.value / max) * 100}%` }} />
            </div>
          </>
        );
        return (
          <li key={row.key}>
            {row.href ? (
              <Link href={row.href} className="block rounded-md focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none">
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
    <li className="flex items-center gap-3 py-2.5">
      <span
        aria-hidden
        className={cn("grid size-8 place-items-center rounded-lg", hot ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground")}
      >
        <Icon className="size-4" />
      </span>
      <span className="flex-1 text-sm">{label}</span>
      {loading ? (
        <Skeleton className="h-5 w-8" />
      ) : (
        <span className={cn("num text-sm font-semibold", !hot && "text-muted-foreground")}>{formatCount(count ?? 0, locale)}</span>
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
    <div className="grid gap-4">
      {(showInventory || showSales || showService) && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {showInventory && (
            <>
              <Kpi label={t("dashboard.kpi.units")} value={formatCount(inventory.data?.units_total, locale)} href="/units" loading={inventory.isLoading} />
              <Kpi
                label={t("dashboard.kpi.available")}
                value={formatCount(inventory.data?.by_status.available ?? 0, locale)}
                href="/units?status=available"
                loading={inventory.isLoading}
              />
            </>
          )}
          {showSales && (
            <>
              <Kpi label={t("dashboard.kpi.salesInProgress")} value={formatCount(inProgress, locale)} loading={sales.isLoading} />
              <Kpi label={t("dashboard.kpi.collected")} value={formatMoney(sales.data?.collected, locale)} loading={sales.isLoading} />
            </>
          )}
          {showService && (
            <Kpi label={t("dashboard.kpi.openRequests")} value={formatCount(service.data?.open_requests, locale)} loading={service.isLoading} />
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

