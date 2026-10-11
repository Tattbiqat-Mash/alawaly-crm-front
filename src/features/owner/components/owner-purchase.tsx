"use client";

import { CalendarDays, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormError, NotFoundState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { HandoverStatusBadge, SeverityBadge, SnagStatusBadge } from "@/features/handover/components/handover-badges";
import { SaleStatusBadge } from "@/features/sales/components/badges";
import { useErrorMessage } from "@/hooks/use-error-message";
import { Link } from "@/i18n/navigation";
import { formatDate, formatDateTime, todayIso } from "@/lib/format/dates";
import { localizedField, localizedName } from "@/lib/format/localized";
import { formatMoney } from "@/lib/format/money";
import { useAcceptHandover, useInstallments, useMyHandover, useMySales, useMyWarranties } from "../hooks";
import { useEligibilityText } from "./eligibility";
import { InstallmentBadge } from "./owner-badges";
import { OwnerCard, OwnerCardTitle, OwnerEmpty, OwnerError, OwnerList, OwnerListSkeleton, OwnerRow } from "./owner-ui";

function NotFoundCard() {
  return (
    <OwnerCard className="p-0">
      <NotFoundState compact />
    </OwnerCard>
  );
}

// O09 — Purchase and installments. There is no GET /owner/sales/{id}: the sale comes from the list (D14).
export function OwnerPurchaseView({ saleId }: { saleId: number }) {
  const t = useTranslations();
  const locale = useLocale();
  const sales = useMySales();
  const installments = useInstallments(saleId);

  if (sales.isLoading) return <Skeleton className="h-60 w-full rounded-2xl" />;
  if (sales.error) return <OwnerError error={sales.error} onRetry={() => sales.refetch()} />;
  const sale = sales.data?.find((s) => s.id === saleId);
  if (!sale) return <NotFoundCard />;

  return (
    <div className="grid gap-3.5">
      <OwnerCard>
        <div className="flex items-center justify-between gap-2">
          <p className="num text-sm font-semibold">{t("units.detail.titleNumber", { number: `#${sale.unit_id}` })}</p>
          <SaleStatusBadge status={sale.status} />
        </div>
        <p className="num mt-2 text-2xl font-bold">{formatMoney(sale.price_agreed, locale)}</p>
        {sale.contracted_at && <p className="num mt-1 text-xs text-muted-foreground">{t("ownerPortal.purchase.contractedOn", { date: formatDate(sale.contracted_at, locale) })}</p>}
        {sale.status !== "draft" && sale.status !== "cancelled" && (
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link href={`/owner/handover/${sale.id}`}>
              <KeyRound data-icon="inline-start" />
              {t("ownerPortal.units.viewHandover")}
            </Link>
          </Button>
        )}
      </OwnerCard>

      <h2 className="px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t("ownerPortal.purchase.installments")}</h2>
      {installments.isLoading ? (
        <OwnerListSkeleton />
      ) : installments.error ? (
        <OwnerError error={installments.error} onRetry={() => installments.refetch()} />
      ) : (installments.data ?? []).length === 0 ? (
        <OwnerEmpty icon={CalendarDays} title={t("ownerPortal.purchase.noInstallments")} />
      ) : (
        <OwnerList>
          {[...installments.data!]
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((i) => (
              <OwnerRow
                key={i.id}
                href={`/owner/payments/${i.id}`}
                title={localizedField(i, "payment_title", locale) || `#${i.id}`}
                subtitle={
                  <span className="num">
                    {formatDate(i.date, locale)} · {formatMoney(i.amount, locale)}
                  </span>
                }
                trailing={<InstallmentBadge status={i.status} state={i.state} />}
              />
            ))}
        </OwnerList>
      )}
    </div>
  );
}

// O10 — Handover. Only the owner can accept; acceptance starts the warranty.
export function OwnerHandoverView({ saleId }: { saleId: number }) {
  const t = useTranslations();
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const query = useMyHandover(saleId);
  const accept = useAcceptHandover();
  const [confirming, setConfirming] = useState(false);

  if (query.isLoading) return <Skeleton className="h-60 w-full rounded-2xl" />;
  if (query.error) return <OwnerError error={query.error} onRetry={() => query.refetch()} />;
  const h = query.data;
  if (!h) return <OwnerEmpty icon={KeyRound} title={t("ownerPortal.handover.none")} description={t("ownerPortal.handover.noneBody")} />;

  const snags = h.items ?? [];
  const openSnags = snags.filter((s) => s.status === "open").length;
  const accepted = h.status === "accepted" || h.status === "accepted_with_snags" || h.status === "closed";

  return (
    <div className="grid gap-3.5">
      <OwnerCard>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">{t("ownerPortal.handover.date")}</p>
          <HandoverStatusBadge status={h.status} />
        </div>
        <p className="num mt-1 text-lg font-bold">{formatDateTime(h.scheduled_at, locale)}</p>
        {h.notes && (
          <p className="mt-2 text-sm text-muted-foreground" dir="auto">
            {h.notes}
          </p>
        )}
      </OwnerCard>

      {(h.status !== "scheduled" || snags.length > 0) && (
        <OwnerCard>
          <OwnerCardTitle>{t("ownerPortal.handover.snags", { count: snags.length })}</OwnerCardTitle>
          {snags.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("ownerPortal.handover.noSnags")}</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {snags.map((s) => (
                <li key={s.id} className="flex items-start justify-between gap-2 py-2.5">
                  <div className="min-w-0 text-sm">
                    <p className="font-medium" dir="auto">
                      {s.area} · {s.description}
                    </p>
                    <div className="mt-1">
                      <SeverityBadge severity={s.severity} />
                    </div>
                  </div>
                  <SnagStatusBadge status={s.status} />
                </li>
              ))}
            </ul>
          )}
        </OwnerCard>
      )}

      {accepted ? (
        <OwnerCard className="border-success/30 bg-success/5">
          <OwnerCardTitle icon={ShieldCheck}>{t("ownerPortal.handover.acceptedTitle")}</OwnerCardTitle>
          <p className="num text-sm">{t("ownerPortal.handover.warrantyStarts", { date: formatDate(h.accepted_at, locale) })}</p>
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link href="/owner/warranties">{t("ownerPortal.warranties.title")}</Link>
          </Button>
        </OwnerCard>
      ) : h.status === "scheduled" ? (
        <p className="px-1 text-sm text-muted-foreground">{t("ownerPortal.handover.waitInspection")}</p>
      ) : (
        <>
          <p className="px-1 text-sm text-muted-foreground">{t("ownerPortal.handover.acceptNote")}</p>
          {accept.error && !confirming && <FormError>{errorMessage(accept.error)}</FormError>}
          <Button className="h-12 text-base" disabled={accept.isPending} onClick={() => setConfirming(true)}>
            {accept.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
            {openSnags > 0 ? t("ownerPortal.handover.acceptWithOpen") : t("ownerPortal.handover.accept")}
          </Button>
        </>
      )}

      <ConfirmDialog
        open={confirming}
        onOpenChange={(o) => {
          setConfirming(o);
          if (!o) accept.reset();
        }}
        title={t("ownerPortal.handover.confirmTitle")}
        consequence={openSnags > 0 ? t("ownerPortal.handover.confirmBodyOpen", { count: openSnags }) : t("ownerPortal.handover.confirmBody")}
        confirmLabel={openSnags > 0 ? t("ownerPortal.handover.acceptWithOpen") : t("ownerPortal.handover.accept")}
        pending={accept.isPending}
        error={accept.error ? errorMessage(accept.error) : undefined}
        onConfirm={() =>
          accept.mutate(h.id, {
            onSuccess: () => {
              toast.success(t("ownerPortal.handover.acceptedTitle"));
              setConfirming(false);
            },
          })
        }
      />
    </div>
  );
}

// O11 — Warranties.
export function OwnerWarrantiesView() {
  const t = useTranslations();
  const locale = useLocale();
  const text = useEligibilityText();
  const list = useMyWarranties();

  if (list.isLoading) return <OwnerListSkeleton />;
  if (list.error) return <OwnerError error={list.error} onRetry={() => list.refetch()} />;
  const items = list.data?.items ?? [];
  if (items.length === 0) return <OwnerEmpty icon={ShieldCheck} title={t("ownerPortal.warranties.empty")} />;
  // Read the date only once data is in, so prerendering never touches the clock.
  const today = todayIso();

  return (
    <div className="grid gap-3">
      {items.map((w) => {
        const active = w.expires_on >= today && w.starts_on <= today;
        return (
          <OwnerCard key={w.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{localizedName(w, locale) || text.category(w.category)}</p>
                <p className="num mt-0.5 text-xs text-muted-foreground">
                  {t("units.detail.titleNumber", { number: `#${w.unit_id}` })} · {formatDate(w.starts_on, locale)} → {formatDate(w.expires_on, locale)}
                </p>
              </div>
              <StatusBadge tone={active ? "success" : "neutral"}>{active ? t("ownerPortal.warranties.active") : t("ownerPortal.warranties.inactive")}</StatusBadge>
            </div>
            {active && (
              <Button asChild variant="outline" className="mt-3 h-11 w-full">
                <Link href={`/owner/requests/new?unit=${w.unit_id}&kind=warranty&category=${w.category}`}>{t("ownerPortal.warranties.claim")}</Link>
              </Button>
            )}
          </OwnerCard>
        );
      })}
      <p className="px-1 text-xs text-muted-foreground">{t("ownerPortal.warranties.reminder")}</p>
    </div>
  );
}
