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
    <section className="rounded-2xl border bg-card p-4">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Icon aria-hidden className="size-4" />
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
      <div className="rounded-2xl border bg-card">
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
      <div className="rounded-2xl border bg-card">
        <StatePanel icon={Sparkles} title={t("owner.home.welcomeTitle")} description={t("owner.home.welcomeBody")} />
      </div>
    );
  }

  const installment = next.installment;

  return (
    <div className="grid gap-3">
      {handover.handover && isHandoverStatus(handover.handover.status) && (
        <section className="rounded-2xl border border-primary/30 bg-accent p-4 text-accent-foreground">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <KeyRound aria-hidden className="size-4" />
            {t("owner.home.handover")}
          </h2>
          <p className="mt-1 text-base font-semibold">
            {handover.handover.status === "inspected"
              ? t("owner.home.handoverWaiting")
              : t("owner.home.handoverScheduled", { date: formatDateTime(handover.handover.scheduled_at, locale) })}
          </p>
        </section>
      )}

      <HomeCard icon={CalendarClock} title={t("owner.home.nextInstallment")} loading={sales.isLoading || next.isLoading}>
        {installment ? (
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="num text-2xl font-semibold">{formatMoney(installment.amount, locale)}</p>
              <p className="text-sm text-muted-foreground">
                {localizedField(installment, "payment_title", locale)} · {t("owner.home.due", { date: formatDate(installment.date, locale) })}
              </p>
            </div>
            <StatusBadge tone="warning">{t("statuses.installment.pending")}</StatusBadge>
          </div>
        ) : next.error ? (
          <p className="text-sm text-destructive">{t("errors.generic")}</p>
        ) : (
          <p className="text-sm text-muted-foreground">{t("owner.home.noInstallments")}</p>
        )}
      </HomeCard>

      <div className="grid grid-cols-2 gap-3">
        <HomeCard icon={Home} title={t("owner.home.myUnits")} loading={units.isLoading}>
          <p className="text-base font-semibold">{t("owner.home.unitsCount", { count: units.data?.meta.total ?? 0 })}</p>
        </HomeCard>
        <HomeCard icon={Wrench} title={t("owner.home.openRequests")} loading={requests.isLoading}>
          {requests.error ? (
            <p className="text-sm text-destructive">{t("errors.generic")}</p>
          ) : (
            <p className="text-base font-semibold">{t("owner.home.requestsCount", { count: requests.data?.meta.total ?? 0 })}</p>
          )}
        </HomeCard>
      </div>

      <HomeCard icon={Bell} title={t("owner.home.notifications")} loading={notifications.isLoading}>
        {notifications.error ? (
          <p className="text-sm text-destructive">{t("errors.generic")}</p>
        ) : notifications.data?.items.length ? (
          <ul className="divide-y">
            {notifications.data.items.map((n) => (
              <li key={n.id} className="py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium" dir="auto">
                    {n.title}
                  </p>
                  {!isOn(n.is_read) && <StatusBadge tone="primary">{t("owner.home.newBadge")}</StatusBadge>}
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground" dir="auto">
                  {n.message}
                </p>
                <p className="num mt-1 text-xs text-muted-foreground">{formatDateTime(n.created_at, locale)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t("owner.home.noNotifications")}</p>
        )}
      </HomeCard>
    </div>
  );
}
