"use client";

import { Bell, Building2, CalendarClock, Home, KeyRound, Sparkles, Wrench, type LucideIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { ErrorState, StatePanel } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { isHandoverStatus } from "@/config/statuses";
import { UnitStatusBadge } from "@/features/inventory/components/unit-status-badge";
import { formatDate, formatDateTime } from "@/lib/format/dates";
import { isOn, localizedField } from "@/lib/format/localized";
import { formatMoney } from "@/lib/format/money";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useLatestNotifications, useNextInstallment, useOpenRequests, useOwnerSales, useOwnerUnits, useWaitingHandover } from "../hooks";

/** A home card; with `href` the whole card links to its screen. */
function HomeCard({ icon: Icon, title, children, loading, href }: { icon: LucideIcon; title: string; children: ReactNode; loading?: boolean; href?: string }) {
  const card = (
    <section className="h-full rounded-2xl border bg-card p-3.5 shadow-2xs transition-all hover:border-primary/30 hover:shadow-xs sm:p-4.5">
      <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        <span aria-hidden className="grid size-6 place-items-center rounded-md bg-muted text-muted-foreground">
          <Icon className="size-3.5" />
        </span>
        {title}
      </h2>
      {loading ? <Skeleton className="h-7 w-2/3" /> : children}
    </section>
  );
  return href ? (
    <Link href={href} className="block rounded-2xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
      {card}
    </Link>
  ) : (
    card
  );
}

// O03 — Owner home.
export function OwnerHome() {
  const t = useTranslations();
  const locale = useLocale();
  const units = useOwnerUnits();
  const sales = useOwnerSales();
  const requests = useOpenRequests();
  const notifications = useLatestNotifications();
  const next = useNextInstallment(sales.data);
  const handover = useWaitingHandover(sales.data);

  const coreError = units.error ?? sales.error;
  if (coreError) {
    return (
      <div className="rounded-2xl border bg-card p-4 shadow-2xs">
        <ErrorState
          error={coreError}
          onRetry={() => {
            units.refetch();
            sales.refetch();
          }}
        />
      </div>
    );
  }

  const isNewOwner =
    !units.isLoading && !sales.isLoading && (units.data?.meta.total ?? 0) === 0 && (sales.data?.length ?? 0) === 0;

  if (isNewOwner) {
    return (
      <div className="rounded-2xl border bg-card shadow-2xs">
        <StatePanel icon={Sparkles} title={t("owner.home.welcomeTitle")} description={t("owner.home.welcomeBody")} />
      </div>
    );
  }

  const installment = next.installment;

  return (
    <div className="grid gap-3.5 md:gap-4.5">
      <div className="grid gap-3.5 md:grid-cols-2">
        {handover.handover && isHandoverStatus(handover.handover.status) ? (
          <Link
            href={`/owner/handover/${handover.handover.sale_id}`}
            className="relative block overflow-hidden rounded-2xl border border-primary/30 bg-primary/10 p-4 text-foreground shadow-2xs transition-colors hover:bg-primary/15 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:p-4.5"
          >
            <div className="flex items-center gap-2">
              <span aria-hidden className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
                <KeyRound className="size-4" />
              </span>
              <h2 className="text-xs font-bold tracking-wide text-primary uppercase">
                {t("owner.home.handover")}
              </h2>
            </div>
            <p className="mt-2 text-sm font-bold text-foreground sm:text-base">
              {handover.handover.status === "inspected"
                ? t("owner.home.handoverWaiting")
                : t("owner.home.handoverScheduled", { date: formatDateTime(handover.handover.scheduled_at, locale) })}
            </p>
          </Link>
        ) : null}

        {/* Next installment card */}
        <section className={cn("rounded-2xl border bg-card p-4 shadow-2xs ring-1 ring-border/50 transition-all hover:border-primary/40 hover:shadow-xs sm:p-4.5", !handover.handover && "md:col-span-2")}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <span aria-hidden className="grid size-6 place-items-center rounded-md bg-primary/10 text-primary">
                <CalendarClock className="size-3.5" />
              </span>
              {t("owner.home.nextInstallment")}
            </h2>
            {installment && <StatusBadge tone="warning">{t("statuses.installment.pending")}</StatusBadge>}
          </div>
          <div className="mt-2.5">
            {sales.isLoading || next.isLoading ? (
              <Skeleton className="h-7 w-32" />
            ) : installment ? (
              <div>
                <Link href={`/owner/payments/${installment.id}`} className="num text-xl font-bold tracking-tight text-foreground underline-offset-4 hover:underline sm:text-2xl">
                  {formatMoney(installment.amount, locale)}
                </Link>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/80">{localizedField(installment, "payment_title", locale)}</span>
                  {" · "}
                  <span>{t("owner.home.due", { date: formatDate(installment.date, locale) })}</span>
                </p>
              </div>
            ) : next.error ? (
              <p className="text-sm text-destructive">{t("errors.generic")}</p>
            ) : (
              <p className="text-sm text-muted-foreground">{t("owner.home.noInstallments")}</p>
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <HomeCard icon={Home} title={t("owner.home.myUnits")} loading={units.isLoading} href="/owner/units">
          <p className="num text-lg font-bold tracking-tight text-foreground sm:text-xl">
            {t("owner.home.unitsCount", { count: units.data?.meta.total ?? 0 })}
          </p>
        </HomeCard>
        <HomeCard icon={Wrench} title={t("owner.home.openRequests")} loading={requests.isLoading} href="/owner/requests?show=open">
          {requests.error ? (
            <p className="text-sm text-destructive">{t("errors.generic")}</p>
          ) : (
            <p className="num text-lg font-bold tracking-tight text-foreground sm:text-xl">
              {t("owner.home.requestsCount", { count: requests.data?.meta.total ?? 0 })}
            </p>
          )}
        </HomeCard>
      </div>

      {units.data?.items && units.data.items.length > 0 && (
        <section className="rounded-2xl border bg-card p-3.5 shadow-2xs sm:p-4.5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <span aria-hidden className="grid size-6 place-items-center rounded-md bg-sand-muted text-sand">
                <Building2 className="size-3.5" />
              </span>
              {t("owner.home.myUnits")}
            </h2>
            <span className="num text-xs font-semibold text-muted-foreground">
              {t("owner.home.unitsCount", { count: units.data.meta.total ?? units.data.items.length })}
            </span>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {units.data.items.map((u) => (
              <Link
                key={u.id}
                href={`/owner/units/${u.id}`}
                className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border/80 bg-background/50 p-3 transition-all hover:border-primary/40 hover:bg-card hover:shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      aria-hidden
                      className="grid size-8.5 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20 transition-transform group-hover:scale-105"
                    >
                      <Building2 className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="num truncate text-sm font-bold text-foreground sm:text-base">
                        {t("units.detail.titleNumber", { number: u.unit_number ?? `#${u.id}` })}
                      </p>
                      {u.unit_code && (
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {u.unit_code}
                        </p>
                      )}
                    </div>
                  </div>
                  <UnitStatusBadge status={u.status} />
                </div>

                {u.owned_since && (
                  <div className="mt-2.5 flex items-center justify-between border-t border-border/50 pt-2 text-xs text-muted-foreground">
                    <span>{t("ownership.columns.since")}</span>
                    <span className="num font-medium text-foreground/85">{formatDate(u.owned_since, locale)}</span>
                  </div>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      <HomeCard icon={Bell} title={t("owner.home.notifications")} loading={notifications.isLoading} href="/owner/notifications">
        {notifications.error ? (
          <p className="text-sm text-destructive">{t("errors.generic")}</p>
        ) : notifications.data?.items.length ? (
          <ul className="divide-y divide-border/60">
            {notifications.data.items.map((n) => (
              <li key={n.id} className="py-3 first:pt-1 last:pb-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground" dir="auto">
                    {n.title}
                  </p>
                  {!isOn(n.is_read) && <StatusBadge tone="primary">{t("owner.home.newBadge")}</StatusBadge>}
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground" dir="auto">
                  {n.message}
                </p>
                <p className="num mt-1 text-[11px] text-muted-foreground/75">{formatDateTime(n.created_at, locale)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-2 text-sm text-muted-foreground">{t("owner.home.noNotifications")}</p>
        )}
      </HomeCard>
    </div>
  );
}
