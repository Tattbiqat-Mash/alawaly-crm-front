"use client";

import { Banknote, CalendarClock, CreditCard, Info, Loader2, ReceiptText } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormError, NotFoundState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PaymentStatusBadge, ReservationStateBadge } from "@/features/sales/components/badges";
import { useErrorMessage } from "@/hooks/use-error-message";
import { useNow } from "@/hooks/use-now";
import { Link, useRouter } from "@/i18n/navigation";
import { toApiError } from "@/lib/api/errors";
import { useIdempotencyKey } from "@/lib/api/idempotency";
import { formatDateTime, formatRelative } from "@/lib/format/dates";
import { formatMoney } from "@/lib/format/money";
import type { InitiatedOwnerPayment, OwnerReservation } from "../api";
import { useAvailability, useCancelReservation, useInitiateReservationPayment, useMyReservations, usePayment, useReserve } from "../hooks";
import { InstallmentBadge } from "./owner-badges";
import { OwnerCard, OwnerCardTitle, OwnerEmpty, OwnerError, OwnerListSkeleton } from "./owner-ui";

const AVAILABILITY_REASONS = ["UNIT_INACTIVE", "ACTIVE_RESERVATION_EXISTS"] as const;

function NotFoundCard() {
  return (
    <OwnerCard className="p-0">
      <NotFoundState compact />
    </OwnerCard>
  );
}

/** Online card payment is part of the brief but no gateway is chosen yet: visible, disabled, explained. */
function CardPaymentSoon() {
  const t = useTranslations("ownerPortal.pay");
  return (
    <div className="grid gap-1">
      <Button variant="outline" className="h-11" disabled>
        <CreditCard data-icon="inline-start" />
        {t("card")}
      </Button>
      <p className="text-center text-xs text-muted-foreground">{t("cardSoon")}</p>
    </div>
  );
}

// O06 — Reserve a unit (reached from a unit link; there is no owner catalogue in the API).
export function OwnerReserveView({ unitId }: { unitId: number }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const availability = useAvailability(unitId);
  const reserve = useReserve();
  // One key per screen visit: a double tap or a retry never creates a second reservation.
  const idempotency = useIdempotencyKey();

  if (availability.isLoading) return <Skeleton className="h-48 w-full rounded-2xl" />;
  if (availability.error) {
    if (toApiError(availability.error).code === "NOT_FOUND") return <NotFoundCard />;
    return <OwnerError error={availability.error} onRetry={() => availability.refetch()} />;
  }
  const a = availability.data!;
  const taken = reserve.error && toApiError(reserve.error).code === "UNIT_NOT_AVAILABLE";

  return (
    <div className="grid gap-3.5">
      <OwnerCard>
        <div className="flex items-center justify-between gap-2">
          <p className="num text-base font-bold">{t("units.detail.titleNumber", { number: `#${a.unit_id}` })}</p>
          <StatusBadge tone={a.available ? "success" : "neutral"}>{a.available ? t("units.availability.available") : t("units.availability.notAvailable")}</StatusBadge>
        </div>
        {a.reservation_amount && (
          <p className="mt-3 text-sm">
            {t("units.availability.fee")}: <span className="num font-semibold">{formatMoney(a.reservation_amount, locale)}</span>
          </p>
        )}
        {a.hold_hours !== null && a.hold_hours !== undefined && (
          <p className="mt-1 text-sm text-muted-foreground">
            {t("units.availability.hold")}: <span className="num">{t("units.availability.holdHours", { hours: a.hold_hours })}</span>
          </p>
        )}
        {a.reasons.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {a.reasons
              .map((r) => ((AVAILABILITY_REASONS as readonly string[]).includes(r) ? t(`units.availability.reasons.${r as (typeof AVAILABILITY_REASONS)[number]}`) : r))
              .join(" · ")}
          </p>
        )}
      </OwnerCard>
      {a.available && (
        <>
          <p className="flex items-start gap-2 px-1 text-sm text-muted-foreground">
            <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
            {t("ownerPortal.reserve.whatNext")}
          </p>
          {reserve.error && <FormError>{taken ? t("ownerPortal.reserve.taken") : errorMessage(reserve.error)}</FormError>}
          <Button
            className="h-12 text-base"
            disabled={reserve.isPending || Boolean(taken)}
            onClick={() =>
              reserve.mutate(
                { unitId, key: idempotency.key },
                {
                  onSuccess: (r) => {
                    toast.success(t("ownerPortal.reserve.done"));
                    router.push(`/owner/reservations/${r.id}/pay`);
                  },
                  onError: (err) => {
                    if (toApiError(err).code === "UNIT_NOT_AVAILABLE") availability.refetch();
                    if (toApiError(err).code === "IDEMPOTENCY_CONFLICT") idempotency.renew();
                  },
                },
              )
            }
          >
            {reserve.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
            {t("ownerPortal.reserve.submit")}
          </Button>
        </>
      )}
    </div>
  );
}

/** Rendered only once data is in, so the clock never runs during prerender. */
function ReservationCard({ r, onCancel }: { r: OwnerReservation; onCancel: () => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const now = useNow();
  const pending = r.state === "pending";
  const unpaid = r.payment_status !== "paid";
  return (
    <OwnerCard>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="num text-sm font-semibold">{t("units.detail.titleNumber", { number: `#${r.unit_id}` })}</p>
          <p className="num mt-0.5 text-xs text-muted-foreground">
            {pending && unpaid && r.payment_amount
              ? t("ownerPortal.reservations.payWithin", { amount: formatMoney(r.payment_amount, locale), when: formatRelative(r.expires_at, locale, now) ?? "—" })
              : r.state === "active"
                ? t("ownerPortal.reservations.feePaid")
                : formatDateTime(r.created_at, locale)}
          </p>
        </div>
        <ReservationStateBadge state={r.state} />
      </div>
      {pending && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {unpaid ? (
            <Button asChild className="h-11">
              <Link href={`/owner/reservations/${r.id}/pay`}>{t("ownerPortal.reservations.pay")}</Link>
            </Button>
          ) : (
            <span />
          )}
          <Button variant="outline" className="h-11" onClick={onCancel}>
            {t("ownerPortal.reservations.cancel")}
          </Button>
        </div>
      )}
      {r.state === "active" && <p className="mt-2 text-xs text-muted-foreground">{t("ownerPortal.reservations.contactToCancel")}</p>}
    </OwnerCard>
  );
}

// O07 — My reservations. Pending ones can be cancelled here; paid ones need staff.
export function OwnerReservationsView() {
  const t = useTranslations();
  const errorMessage = useErrorMessage();
  const list = useMyReservations();
  const cancel = useCancelReservation();
  const [cancelling, setCancelling] = useState<OwnerReservation | null>(null);

  if (list.isLoading) return <OwnerListSkeleton />;
  if (list.error) return <OwnerError error={list.error} onRetry={() => list.refetch()} />;
  const items = [...(list.data?.items ?? [])].sort((a, b) => b.id - a.id);
  const needsStaff = cancel.error && toApiError(cancel.error).code === "CANCEL_NEEDS_STAFF";

  return (
    <div className="grid gap-3">
      {items.length === 0 ? (
        <OwnerEmpty icon={CalendarClock} title={t("ownerPortal.reservations.empty")} />
      ) : (
        items.map((r) => <ReservationCard key={r.id} r={r} onCancel={() => setCancelling(r)} />)
      )}
      <ConfirmDialog
        open={cancelling !== null}
        onOpenChange={(o) => {
          if (!o) {
            setCancelling(null);
            cancel.reset();
          }
        }}
        title={t("ownerPortal.reservations.cancelTitle")}
        consequence={t("ownerPortal.reservations.cancelBody")}
        confirmLabel={t("ownerPortal.reservations.cancel")}
        destructive
        pending={cancel.isPending}
        error={cancel.error ? (needsStaff ? t("ownerPortal.reservations.contactToCancel") : errorMessage(cancel.error)) : undefined}
        onConfirm={() =>
          cancelling &&
          cancel.mutate(cancelling.id, {
            onSuccess: () => {
              toast.success(t("ownerPortal.reservations.cancelled"));
              setCancelling(null);
            },
          })
        }
      />
    </div>
  );
}

// O08 (reservation fee) — start an offline payment and show the instructions.
export function OwnerReservationPayView({ reservationId }: { reservationId: number }) {
  const t = useTranslations();
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const list = useMyReservations();
  const initiate = useInitiateReservationPayment();
  const idempotency = useIdempotencyKey();
  const [started, setStarted] = useState<InitiatedOwnerPayment | null>(null);

  if (list.isLoading) return <Skeleton className="h-48 w-full rounded-2xl" />;
  if (list.error) return <OwnerError error={list.error} onRetry={() => list.refetch()} />;
  const r = list.data?.items.find((x) => x.id === reservationId);
  if (!r) return <NotFoundCard />;
  const paid = r.payment_status === "paid";
  const code = initiate.error ? toApiError(initiate.error).code : null;

  return (
    <div className="grid gap-3.5">
      <OwnerCard>
        <p className="text-xs text-muted-foreground">{t("ownerPortal.pay.reservationFee", { unit: `#${r.unit_id}` })}</p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="num text-2xl font-bold">{formatMoney(r.payment_amount, locale)}</p>
          {paid ? <StatusBadge tone="success">{t("statuses.installment.paid")}</StatusBadge> : <ReservationStateBadge state={r.state} />}
        </div>
      </OwnerCard>

      {paid ? (
        <OwnerCard>
          <p className="text-sm">{t("ownerPortal.pay.alreadyPaid")}</p>
        </OwnerCard>
      ) : started ? (
        <OwnerCard>
          <OwnerCardTitle icon={ReceiptText} action={<PaymentStatusBadge status={started.transaction.status} />}>
            {t("ownerPortal.pay.transaction", { id: started.transaction.id })}
          </OwnerCardTitle>
          <p className="text-sm leading-relaxed" dir="auto">
            {started.session?.instructions || t("ownerPortal.pay.offlineHowTo")}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">{t("ownerPortal.pay.staffConfirms")}</p>
        </OwnerCard>
      ) : (
        <>
          <OwnerCard>
            <OwnerCardTitle icon={Banknote}>{t("ownerPortal.pay.howTitle")}</OwnerCardTitle>
            <p className="text-sm leading-relaxed text-muted-foreground">{t("ownerPortal.pay.offlineHowTo")}</p>
          </OwnerCard>
          {initiate.error && <FormError>{code === "ALREADY_PAID" ? t("ownerPortal.pay.alreadyPaid") : errorMessage(initiate.error)}</FormError>}
          <Button
            className="h-12 text-base"
            disabled={initiate.isPending || r.state !== "pending"}
            onClick={() =>
              initiate.mutate(
                { reservationId: r.id, key: idempotency.key },
                {
                  onSuccess: (p) => setStarted(p),
                  onError: (err) => {
                    if (toApiError(err).code === "IDEMPOTENCY_CONFLICT") idempotency.renew();
                  },
                },
              )
            }
          >
            {initiate.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
            {t("ownerPortal.pay.startOffline")}
          </Button>
          <CardPaymentSoon />
        </>
      )}
    </div>
  );
}

// O08 (installment) — server-verified status; polled until paid.
export function OwnerPaymentView({ paymentId }: { paymentId: number }) {
  const t = useTranslations();
  const locale = useLocale();
  const query = usePayment(paymentId);

  if (query.isLoading) return <Skeleton className="h-48 w-full rounded-2xl" />;
  if (query.error) {
    if (toApiError(query.error).code === "NOT_FOUND") return <NotFoundCard />;
    return <OwnerError error={query.error} onRetry={() => query.refetch()} />;
  }
  const p = query.data!;
  const paid = p.status === "paid";

  return (
    <div className="grid gap-3.5">
      <OwnerCard>
        <div className="flex items-center justify-between gap-2">
          <p className="num text-2xl font-bold">{formatMoney(p.amount, locale)}</p>
          <InstallmentBadge status={p.status} state={null} />
        </div>
        {p.paid_at && <p className="num mt-1 text-xs text-muted-foreground">{t("ownerPortal.pay.paidAt", { date: formatDateTime(p.paid_at, locale) })}</p>}
      </OwnerCard>

      {!paid && (
        <>
          <OwnerCard>
            <OwnerCardTitle icon={Banknote}>{t("ownerPortal.pay.howTitle")}</OwnerCardTitle>
            <p className="text-sm leading-relaxed text-muted-foreground">{t("ownerPortal.pay.offlineHowTo")}</p>
            <p className="mt-2 text-xs text-muted-foreground">{t("ownerPortal.pay.staffConfirms")}</p>
          </OwnerCard>
          <CardPaymentSoon />
        </>
      )}

      {p.transactions.length > 0 && (
        <OwnerCard>
          <OwnerCardTitle icon={ReceiptText}>{t("ownerPortal.pay.transactions")}</OwnerCardTitle>
          <ul className="divide-y divide-border/60 text-sm">
            {p.transactions.map((tx) => (
              <li key={tx.id} className="flex items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="num font-medium">{formatMoney(tx.amount, locale)}</p>
                  <p className="num text-xs text-muted-foreground">
                    #{tx.id} · {formatDateTime(tx.created_at, locale)}
                  </p>
                </div>
                <PaymentStatusBadge status={tx.status} />
              </li>
            ))}
          </ul>
        </OwnerCard>
      )}
    </div>
  );
}
