"use client";

import { CircleCheck, CircleX, CreditCard, Loader2, Receipt } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Field, fieldA11y } from "@/components/shared/form/field";
import { FormError } from "@/components/shared/states";
import { UnavailableAction } from "@/components/shared/unavailable-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { usePermissions } from "@/features/auth/hooks";
import { UnitPicker } from "@/features/inventory/components/unit-picker";
import { useUnitAvailability } from "@/features/inventory/hooks";
import type { UnitListItem } from "@/features/inventory/types";
import { useErrorMessage } from "@/hooks/use-error-message";
import { Link } from "@/i18n/navigation";
import { toApiError } from "@/lib/api/errors";
import { useIdempotencyKey } from "@/lib/api/idempotency";
import { formatDateTime } from "@/lib/format/dates";
import { formatMoney } from "@/lib/format/money";
import { useCreateReservation, useInitiatePayment } from "../hooks";
import type { Reservation } from "../types";
import { ReservationStateBadge } from "./badges";

function AvailabilitySummary({ unitId }: { unitId: number }) {
  const t = useTranslations();
  const locale = useLocale();
  const availability = useUnitAvailability(unitId);
  if (!availability.allowed) return null;
  if (availability.isLoading) return <Skeleton className="h-16 w-full" />;
  const a = availability.data;
  if (!a) return null;
  return (
    <div className="grid gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
      <p className="flex items-center gap-2 font-medium">
        {a.available ? <CircleCheck aria-hidden className="size-4 text-success" /> : <CircleX aria-hidden className="size-4 text-destructive" />}
        {a.available ? t("units.availability.available") : t("units.availability.notAvailable")}
      </p>
      {a.reasons.length > 0 && <p className="text-xs text-muted-foreground">{a.reasons.join(" · ")}</p>}
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-muted-foreground">
        <span>
          {t("units.availability.fee")}: <span className="num text-foreground">{formatMoney(a.reservation_amount, locale)}</span>
        </span>
        <span>
          {t("units.availability.hold")}:{" "}
          <span className="num text-foreground">{a.hold_hours === null ? "—" : t("units.availability.holdHours", { hours: a.hold_hours })}</span>
        </span>
      </div>
    </div>
  );
}

/** After reserving: record the fee as an offline payment (it is not "paid" until confirmed twice). */
function ReservationResult({ reservation, onAnother }: { reservation: Reservation; onAnother: () => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const { can } = usePermissions();
  const initiate = useInitiatePayment();
  const payKey = useIdempotencyKey();

  return (
    <section className="grid gap-4 rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-center gap-3">
        <CircleCheck aria-hidden className="size-5 text-success" />
        <p className="font-medium">{t("newReservation.created", { id: reservation.id })}</p>
        <ReservationStateBadge state={reservation.state} />
      </div>
      <p className="text-sm text-muted-foreground">
        {reservation.expires_at ? t("newReservation.expiresAt", { date: formatDateTime(reservation.expires_at, locale) }) : t("newReservation.noHold")}
      </p>

      {can("sales.manage") && (
        <div className="grid gap-3 rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">{t("newReservation.recordPaymentHint")}</p>
          {initiate.data ? (
            <div className="grid gap-2 text-sm">
              <p className="font-medium">
                {t("newReservation.paymentCreated", {
                  id: initiate.data.transaction.id,
                  amount: formatMoney(initiate.data.transaction.amount, locale),
                })}
              </p>
              {initiate.data.session.mode === "offline" && (
                <p className="rounded-md bg-muted/50 p-3 text-muted-foreground" dir="auto">
                  {initiate.data.session.instructions}
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() =>
                  initiate.mutate(
                    { body: { provider: "offline", reservation_id: reservation.id }, key: payKey.key },
                    {
                      onError: (e) => {
                        if (toApiError(e).code === "IDEMPOTENCY_CONFLICT") payKey.renew();
                      },
                    },
                  )
                }
                disabled={initiate.isPending}
              >
                {initiate.isPending ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Receipt data-icon="inline-start" />}
                {t("newReservation.recordPayment")}
              </Button>
              <UnavailableAction label={t("newReservation.onlinePayment")} reason={t("newReservation.onlinePaymentSoon")} icon={CreditCard} />
            </div>
          )}
          {initiate.error && <FormError>{errorMessage(initiate.error)}</FormError>}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={onAnother}>
          {t("newReservation.another")}
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/reservations">{t("newReservation.openList")}</Link>
        </Button>
      </div>
    </section>
  );
}

// S12 — New reservation.
export function NewReservationView() {
  const t = useTranslations();
  const errorMessage = useErrorMessage();
  const create = useCreateReservation();
  // Created when the page opens, reused on every retry, renewed after success.
  const idempotency = useIdempotencyKey();
  const [unit, setUnit] = useState<UnitListItem | null>(null);
  const [client, setClient] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [created, setCreated] = useState<Reservation | null>(null);

  const unitError = submitted && !unit ? t("newReservation.unitRequired") : undefined;
  const clientError = submitted && !/^\d+$/.test(client) ? t("newReservation.clientInvalid") : undefined;

  if (created) {
    return (
      <ReservationResult
        reservation={created}
        onAnother={() => {
          setCreated(null);
          setUnit(null);
          setClient("");
          setNotes("");
          setSubmitted(false);
          create.reset();
        }}
      />
    );
  }

  return (
    <form
      noValidate
      className="grid max-w-2xl gap-5 rounded-xl border bg-card p-5"
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
        if (!unit || !/^\d+$/.test(client)) return;
        create.mutate(
          { body: { unit_id: unit.id, client_id: Number(client), notes: notes.trim() || undefined }, key: idempotency.key },
          {
            onSuccess: (r) => {
              idempotency.renew();
              toast.success(t("newReservation.created", { id: r.id }));
              setCreated(r);
            },
            onError: (err) => {
              if (toApiError(err).code === "IDEMPOTENCY_CONFLICT") idempotency.renew();
            },
          },
        );
      }}
    >
      <Field id="res-unit" label={t("newReservation.unit")} required error={unitError}>
        <UnitPicker id="res-unit" value={unit} onChange={setUnit} statuses={["available"]} invalid={Boolean(unitError)} />
      </Field>
      {unit && <AvailabilitySummary unitId={unit.id} />}
      <Field id="res-client" label={t("newReservation.client")} required error={clientError} description={t("newReservation.clientHint")}>
        <Input
          {...fieldA11y("res-client", clientError, true)}
          inputMode="numeric"
          dir="ltr"
          value={client}
          onChange={(e) => setClient(e.target.value.replace(/\D/g, ""))}
          className="max-w-48"
        />
      </Field>
      <Field id="res-notes" label={t("common.notes")}>
        <Textarea id="res-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      {create.error && <FormError>{errorMessage(create.error)}</FormError>}
      <div className="flex justify-end gap-2 border-t pt-4">
        <Button variant="outline" asChild>
          <Link href="/reservations">{t("common.cancel")}</Link>
        </Button>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
          {create.isPending ? t("newReservation.submitting") : t("newReservation.submit")}
        </Button>
      </div>
    </form>
  );
}
