"use client";

import { Bell, CalendarClock, Home, KeyRound, Sparkles, Wrench, type LucideIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { ErrorState, StatePanel } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { isHandoverStatus } from "@/config/statuses";
import { formatDate, formatDateTime } from "@/lib/format/dates";
import { isOn, localizedField } from "@/lib/format/localized";
import { formatMoney } from "@/lib/format/money";
import { useLatestNotifications, useNextInstallment, useOpenRequests, useOwnerSales, useOwnerUnits, useWaitingHandover } from "../hooks";

/**
 * A home card. Cards will deep-link to O04–O15 once those screens ship; until then they are
 * plain cards (no dead links).
 */
function HomeCard({ icon: Icon, title, children, loading }: { icon: LucideIcon; title: string; children: ReactNode; loading?: boolean }) {
  return (
    <section className="rounded-2xl border bg-card p-4.5 shadow-2xs transition-shadow">
      <h2 className="mb-2.5 flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        <span aria-hidden className="grid size-6 place-items-center rounded-md bg-muted text-muted-foreground">
          <Icon className="size-3.5" />
        </span>
        {title}
      </h2>
      {loading ? <Skeleton className="h-7 w-2/3" /> : children}
    </section>
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
    <div className="grid gap-3.5">
      {handover.handover && isHandoverStatus(handover.handover.status) && (
        <section className="relative overflow-hidden rounded-2xl border border-primary/30 bg-primary/10 p-4.5 text-foreground shadow-2xs">
          <div className="flex items-center gap-2">
            <span aria-hidden className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
              <KeyRound className="size-4" />
            </span>
            <h2 className="text-xs font-bold tracking-wide text-primary uppercase">
              {t("owner.home.handover")}
            </h2>
          </div>
          <p className="mt-2 text-base font-bold text-foreground">
            {handover.handover.status === "inspected"
              ? t("owner.home.handoverWaiting")
              : t("owner.home.handoverScheduled", { date: formatDateTime(handover.handover.scheduled_at, locale) })}
          </p>
        </section>
      )}

      {/* Next installment card */}
      <section className="rounded-2xl border bg-card p-5 shadow-2xs ring-1 ring-border/50">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            <span aria-hidden className="grid size-6 place-items-center rounded-md bg-primary/10 text-primary">
              <CalendarClock className="size-3.5" />
            </span>
            {t("owner.home.nextInstallment")}
          </h2>
          {installment && <StatusBadge tone="warning">{t("statuses.installment.pending")}</StatusBadge>}
        </div>
        <div className="mt-3">
          {sales.isLoading || next.isLoading ? (
            <Skeleton className="h-8 w-32" />
          ) : installment ? (
            <div>
              <p className="num text-2xl font-bold tracking-tight text-foreground">{formatMoney(installment.amount, locale)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
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

      <div className="grid grid-cols-2 gap-3">
        <HomeCard icon={Home} title={t("owner.home.myUnits")} loading={units.isLoading}>
          <p className="num text-xl font-bold tracking-tight text-foreground">
            {t("owner.home.unitsCount", { count: units.data?.meta.total ?? 0 })}
          </p>
        </HomeCard>
        <HomeCard icon={Wrench} title={t("owner.home.openRequests")} loading={requests.isLoading}>
          {requests.error ? (
            <p className="text-sm text-destructive">{t("errors.generic")}</p>
          ) : (
            <p className="num text-xl font-bold tracking-tight text-foreground">
              {t("owner.home.requestsCount", { count: requests.data?.meta.total ?? 0 })}
            </p>
          )}
        </HomeCard>
      </div>

      <HomeCard icon={Bell} title={t("owner.home.notifications")} loading={notifications.isLoading}>
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
