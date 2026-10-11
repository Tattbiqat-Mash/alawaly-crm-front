"use client";

import { Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Field, fieldA11y, ReadOnlyField } from "@/components/shared/form/field";
import { FormError } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isReservationState } from "@/config/statuses";
import { UnitPicker } from "@/features/inventory/components/unit-picker";
import { useUnit } from "@/features/inventory/hooks";
import type { UnitListItem } from "@/features/inventory/types";
import { useErrorMessage } from "@/hooks/use-error-message";
import { Link, useRouter } from "@/i18n/navigation";
import { toApiError } from "@/lib/api/errors";
import { useIdempotencyKey } from "@/lib/api/idempotency";
import { formatMoney, fromMinor, toMinor } from "@/lib/format/money";
import { cn } from "@/lib/utils";
import { useCreateSale, useOpenReservations } from "../hooks";
import type { Reservation } from "../types";

type Source = "reservation" | "direct";

const AMOUNT = /^\d+(\.\d{1,2})?$/;
const normalise = (v: string | null | undefined) => {
  const minor = toMinor(v);
  return minor === null ? "" : fromMinor(minor);
};

// S14 — New sale: reservation or unit → client and price → confirm.
export function NewSaleView() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const create = useCreateSale();
  const idempotency = useIdempotencyKey();
  const reservations = useOpenReservations();

  const [source, setSource] = useState<Source>("reservation");
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [unit, setUnit] = useState<UnitListItem | null>(null);
  const [client, setClient] = useState("");
  // null = use the unit's list price; any edit replaces it.
  const [priceDraft, setPriceDraft] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // For a reservation, the unit's list price comes from the unit record.
  const reservedUnit = useUnit(reservation?.unit_id ?? 0);
  const unitId = source === "reservation" ? reservation?.unit_id : unit?.id;
  const clientId = source === "reservation" ? reservation?.client_id : client ? Number(client) : null;
  const listPrice = source === "reservation" ? reservedUnit.data?.unit.price_in_tax : unit?.price_in_tax;
  const price = priceDraft ?? normalise(listPrice);

  const priceError = submitted && !AMOUNT.test(price.trim()) ? t("newSale.priceInvalid") : undefined;
  const clientError = submitted && source === "direct" && !/^\d+$/.test(client) ? t("newReservation.clientInvalid") : undefined;
  const sourceError = submitted && !unitId ? (source === "reservation" ? t("validation.required") : t("newReservation.unitRequired")) : undefined;
  const ready = Boolean(unitId) && Boolean(clientId) && AMOUNT.test(price.trim());

  const step = confirming ? 3 : unitId ? 2 : 1;

  const submit = () => {
    if (!unitId || !clientId) return;
    create.mutate(
      {
        body: {
          unit_id: unitId,
          client_id: clientId,
          reservation_id: source === "reservation" ? reservation?.id : undefined,
          price_agreed: normalise(price),
        },
        key: idempotency.key,
      },
      {
        onSuccess: (sale) => {
          idempotency.renew();
          toast.success(t("newSale.created", { id: sale.id }));
          router.push(`/sales/${sale.id}`);
        },
        onError: (e) => {
          if (toApiError(e).code === "IDEMPOTENCY_CONFLICT") idempotency.renew();
          setConfirming(false);
        },
      },
    );
  };

  return (
    <div className="grid max-w-2xl gap-4">
      <ol className="grid gap-2 sm:grid-cols-3">
        {(["source", "terms", "confirm"] as const).map((key, i) => (
          <li
            key={key}
            aria-current={step === i + 1 ? "step" : undefined}
            className={cn(
              "rounded-lg border px-3 py-2 text-sm",
              step === i + 1 ? "border-primary/40 bg-primary/5 font-medium text-primary" : step > i + 1 ? "text-success" : "text-muted-foreground",
            )}
          >
            {t(`newSale.steps.${key}`)}
          </li>
        ))}
      </ol>

      <form
        noValidate
        className="grid gap-5 rounded-xl border bg-card p-5"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
          if (ready) setConfirming(true);
        }}
      >
        <Tabs
          value={source}
          onValueChange={(v) => {
            setSource(v as Source);
            setReservation(null);
            setUnit(null);
            setConfirming(false);
          }}
        >
          <TabsList>
            <TabsTrigger value="reservation">{t("newSale.fromReservation")}</TabsTrigger>
            <TabsTrigger value="direct">{t("newSale.direct")}</TabsTrigger>
          </TabsList>
        </Tabs>

        {source === "reservation" ? (
          <Field id="sale-reservation" label={t("newSale.reservation")} required error={sourceError}>
            <Select
              value={reservation ? String(reservation.id) : ""}
              onValueChange={(v) => {
                const r = reservations.data?.items.find((x) => String(x.id) === v) ?? null;
                setReservation(r);
                setPriceDraft(null);
                setConfirming(false);
              }}
            >
              <SelectTrigger {...fieldA11y("sale-reservation", sourceError)} className="w-full">
                <SelectValue placeholder={reservations.data?.items.length === 0 ? t("newSale.noOpenReservations") : t("newSale.reservation")} />
              </SelectTrigger>
              <SelectContent>
                {(reservations.data?.items ?? []).map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    #{r.id} · {t("common.unitRef", { id: r.unit_id })} · {r.client_id ? t("common.clientRef", { id: r.client_id }) : "—"} ·{" "}
                    {isReservationState(r.state) ? t(`statuses.reservation.${r.state}`) : r.state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        ) : (
          <>
            <Field id="sale-unit" label={t("newReservation.unit")} required error={sourceError}>
              <UnitPicker
                id="sale-unit"
                value={unit}
                onChange={(u) => {
                  setUnit(u);
                  setPriceDraft(null);
                  setConfirming(false);
                }}
                statuses={["available"]}
                invalid={Boolean(sourceError)}
              />
            </Field>
            <Field id="sale-client" label={t("newReservation.client")} required error={clientError} description={t("newReservation.clientHint")}>
              <Input
                {...fieldA11y("sale-client", clientError, true)}
                inputMode="numeric"
                dir="ltr"
                value={client}
                onChange={(e) => setClient(e.target.value.replace(/\D/g, ""))}
                className="max-w-48"
              />
            </Field>
          </>
        )}

        {unitId && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="sale-price"
              label={t("newSale.price")}
              required
              error={priceError}
              description={listPrice ? t("newSale.priceHint", { price: formatMoney(listPrice, locale) }) : undefined}
            >
              <Input
                {...fieldA11y("sale-price", priceError, Boolean(listPrice))}
                inputMode="decimal"
                dir="ltr"
                value={price}
                placeholder={normalise(listPrice)}
                onChange={(e) => {
                  setPriceDraft(e.target.value.replace(/[^\d.]/g, ""));
                  setConfirming(false);
                }}
              />
            </Field>
            <div>
              <ReadOnlyField label={t("newSale.basis")} value="—" />
              <p className="mt-1.5 text-xs text-muted-foreground">{t("newSale.basisHint")}</p>
            </div>
          </div>
        )}

        {confirming && unitId && clientId && (
          <p role="status" className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
            {t("newSale.confirmText", {
              unit: t("common.unitRef", { id: unitId }),
              client: t("common.clientRef", { id: clientId }),
              price: formatMoney(normalise(price), locale),
            })}
          </p>
        )}
        {create.error && <FormError>{errorMessage(create.error)}</FormError>}

        <div className="flex justify-end gap-2 border-t pt-4">
          {confirming ? (
            <>
              <Button type="button" variant="outline" onClick={() => setConfirming(false)}>
                {t("common.back")}
              </Button>
              <Button type="button" onClick={submit} disabled={create.isPending}>
                {create.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
                {create.isPending ? t("newSale.submitting") : t("newSale.submit")}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" asChild>
                <Link href="/sales">{t("common.cancel")}</Link>
              </Button>
              <Button type="submit">{t("common.next")}</Button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
