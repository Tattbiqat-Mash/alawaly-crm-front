"use client";

import { BellOff, Building, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "@/i18n/navigation";
import { pageCount } from "@/lib/api/envelope";
import { toApiError } from "@/lib/api/errors";
import { formatDate, formatDateTime } from "@/lib/format/dates";
import { isOn } from "@/lib/format/localized";
import { formatMoney } from "@/lib/format/money";
import { cn } from "@/lib/utils";
import type { OwnerMandate, OwnerNotification } from "../api";
import { useMarkRead, useMyMandates, useMyNotifications, useMyStatements } from "../hooks";
import { OwnerCard, OwnerCardTitle, OwnerEmpty, OwnerError, OwnerListSkeleton } from "./owner-ui";

/** Where a notification leads. Only links the API gives us an id for. */
function targetOf(n: OwnerNotification & { service_id?: number | null }) {
  if (n.type.startsWith("service") && n.service_id) return `/owner/requests/${n.service_id}`;
  if (n.type.startsWith("warranty")) return "/owner/warranties";
  return null;
}

// O15 — Notifications (in-app inbox; no push yet, refreshed on open and focus).
export function OwnerNotificationsView() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const list = useMyNotifications(page);
  const markRead = useMarkRead();

  if (list.isLoading) return <OwnerListSkeleton rows={4} />;
  if (list.error) return <OwnerError error={list.error} onRetry={() => list.refetch()} />;
  const items = list.data?.items ?? [];
  if (items.length === 0 && page === 1) return <OwnerEmpty icon={BellOff} title={t("ownerPortal.notifications.empty")} />;
  const pages = list.data ? pageCount(list.data.meta) : 1;

  return (
    <div className="grid gap-3">
      <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border bg-card shadow-2xs">
        {items.map((n) => {
          const unread = !isOn(n.is_read);
          const href = targetOf(n);
          return (
            <li key={n.id}>
              <button
                type="button"
                className={cn("flex w-full items-start gap-3 px-4 py-3 text-start transition-colors hover:bg-muted/50", unread && "bg-primary/5")}
                onClick={() => {
                  if (unread) markRead.mutate(n.id);
                  if (href) router.push(href);
                }}
              >
                <span aria-hidden className={cn("mt-1.5 size-2 shrink-0 rounded-full", unread ? "bg-primary" : "bg-transparent")} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className={cn("text-sm", unread ? "font-semibold" : "font-medium")} dir="auto">
                      {n.title}
                    </span>
                    <StatusBadge tone={unread ? "primary" : "neutral"}>{unread ? t("ownerPortal.notifications.new") : t("ownerPortal.notifications.read")}</StatusBadge>
                  </span>
                  <span className="mt-0.5 line-clamp-3 block text-xs leading-relaxed text-muted-foreground" dir="auto">
                    {n.message}
                  </span>
                  <span className="num mt-1 block text-[11px] text-muted-foreground/75">{formatDateTime(n.created_at, locale)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronRight data-icon="inline-start" className="ltr:rotate-180" />
            {t("ownerPortal.notifications.newer")}
          </Button>
          <span className="num text-xs text-muted-foreground">
            {page} / {pages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            {t("ownerPortal.notifications.older")}
            <ChevronLeft data-icon="inline-end" className="ltr:rotate-180" />
          </Button>
        </div>
      )}
    </div>
  );
}

const MANDATE_STATUSES = ["draft", "active", "ended", "revoked"] as const;
const MANDATE_MODES = ["services_only", "full_management"] as const;
const mandateTone = { draft: "neutral", active: "success", ended: "neutral", revoked: "danger" } as const;

function MandateStatusBadge({ status }: { status: string }) {
  const t = useTranslations("statuses.mandate");
  const known = (MANDATE_STATUSES as readonly string[]).includes(status) ? (status as (typeof MANDATE_STATUSES)[number]) : null;
  return <StatusBadge tone={known ? mandateTone[known] : "neutral"}>{known ? t(known) : status}</StatusBadge>;
}

function useModeLabel() {
  const t = useTranslations("statuses.mandateMode");
  return (mode: string) => ((MANDATE_MODES as readonly string[]).includes(mode) ? t(mode as (typeof MANDATE_MODES)[number]) : mode);
}

const canSeeStatements = (m: OwnerMandate) => m.capabilities.includes("view_statements") || m.mode === "full_management";

function MandateStatements({ mandate }: { mandate: OwnerMandate }) {
  const t = useTranslations("ownerPortal.rentals");
  const tk = useTranslations("statements.kpi");
  const locale = useLocale();
  const allowed = canSeeStatements(mandate);
  const statements = useMyStatements(mandate.id, allowed);
  const scoped = statements.error && toApiError(statements.error).code === "MANDATE_SCOPE";

  if (!allowed || scoped) return <p className="text-xs text-muted-foreground">{t("noStatements")}</p>;
  if (statements.isLoading) return <Skeleton className="h-16 w-full" />;
  if (statements.error) return <p className="text-xs text-destructive">{t("statementsError")}</p>;
  const items = [...(statements.data ?? [])].sort((a, b) => b.period_start.localeCompare(a.period_start));
  if (items.length === 0) return <p className="text-xs text-muted-foreground">{t("statementsEmpty")}</p>;

  return (
    <ul className="grid gap-2">
      {items.map((s) => (
        <li key={s.id} className="rounded-xl border bg-background/60 p-3">
          <p className="num text-xs font-medium">
            {formatDate(s.period_start, locale)} → {formatDate(s.period_end, locale)}
          </p>
          <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
            {(["expected", "collected", "outstanding"] as const).map((k) => (
              <div key={k}>
                <dt className="text-muted-foreground">{tk(k)}</dt>
                <dd className="num mt-0.5 font-semibold">{formatMoney(s.totals[k], locale)}</dd>
              </div>
            ))}
          </dl>
        </li>
      ))}
    </ul>
  );
}

// O16 — Rental mandates and statements (read-only).
export function OwnerRentalsView() {
  const t = useTranslations();
  const locale = useLocale();
  const modeLabel = useModeLabel();
  const list = useMyMandates();

  if (list.isLoading) return <OwnerListSkeleton />;
  if (list.error) return <OwnerError error={list.error} onRetry={() => list.refetch()} />;
  const items = list.data ?? [];
  if (items.length === 0) return <OwnerEmpty icon={Building} title={t("ownerPortal.rentals.empty")} description={t("ownerPortal.rentals.emptyHint")} />;

  return (
    <div className="grid gap-3.5">
      {items.map((m) => (
        <OwnerCard key={m.id}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="num text-sm font-semibold">
                {t("units.detail.titleNumber", { number: `#${m.unit_id}` })} · {modeLabel(m.mode)}
              </p>
              <p className="num mt-0.5 text-xs text-muted-foreground">
                {formatDate(m.valid_from, locale)} → {formatDate(m.valid_to, locale)}
              </p>
            </div>
            <MandateStatusBadge status={m.status} />
          </div>
          <div className="mt-3 border-t pt-3">
            <OwnerCardTitle icon={FileText}>{t("ownerPortal.rentals.statements")}</OwnerCardTitle>
            <MandateStatements mandate={m} />
          </div>
        </OwnerCard>
      ))}
    </div>
  );
}
