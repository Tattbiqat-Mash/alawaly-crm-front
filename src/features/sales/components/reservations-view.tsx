"use client";

import { CalendarPlus, Loader2, XCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type Column } from "@/components/shared/data-table/data-table";
import { paginationProps } from "@/components/shared/data-table/list-params";
import { FilterBar, FilterSelect, ResetFilters, SearchFilter } from "@/components/shared/filters";
import { Field, fieldA11y } from "@/components/shared/form/field";
import { EmptyState, FormError, NotConfiguredState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { OPEN_RESERVATION_STATES, RESERVATION_STATES } from "@/config/statuses";
import { usePermissions } from "@/features/auth/hooks";
import { useEndSide } from "@/hooks/use-end-side";
import { useErrorMessage } from "@/hooks/use-error-message";
import { useNow } from "@/hooks/use-now";
import { Link } from "@/i18n/navigation";
import { toApiError } from "@/lib/api/errors";
import { formatDateTime, formatRelative, serverTimeToEpoch } from "@/lib/format/dates";
import { formatMoney } from "@/lib/format/money";
import { useCancelReservation, useExtendReservation, useReservations, useReservationsState } from "../hooks";
import type { Reservation } from "../types";
import { ReservationStateBadge } from "./badges";

const isOpen = (r: Reservation) => (OPEN_RESERVATION_STATES as readonly string[]).includes(r.state);

function Expires({ value }: { value: string | null }) {
  const t = useTranslations("reservations");
  const locale = useLocale();
  const now = useNow();
  if (!value) return <span className="text-xs text-muted-foreground">{t("noExpiry")}</span>;
  const past = (serverTimeToEpoch(value) ?? 0) < now;
  return (
    <div className="flex flex-col">
      <span className="num">{formatDateTime(value, locale)}</span>
      <span className={past ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
        {past ? t("expired") : formatRelative(value, locale, now)}
      </span>
    </div>
  );
}

function ExtendDialog({ reservation, onClose }: { reservation: Reservation; onClose: () => void }) {
  const t = useTranslations();
  const errorMessage = useErrorMessage();
  const extend = useExtendReservation();
  const [hours, setHours] = useState("24");
  const valid = /^\d+$/.test(hours) && Number(hours) >= 1 && Number(hours) <= 720;
  const notConfigured = extend.error && toApiError(extend.error).code === "POLICY_NOT_CONFIGURED";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form
          noValidate
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid) return;
            extend.mutate(
              { id: reservation.id, hours: Number(hours) },
              {
                onSuccess: () => {
                  toast.success(t("reservations.extended"));
                  onClose();
                },
              },
            );
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("reservations.extendTitle")}</DialogTitle>
            <DialogDescription>{t("reservations.extendBody", { id: reservation.id })}</DialogDescription>
          </DialogHeader>
          {notConfigured ? (
            <NotConfiguredState compact details={toApiError(extend.error).details} />
          ) : (
            <>
              <Field id="extend-hours" label={t("reservations.hours")} error={!valid ? t("reservations.hoursInvalid") : undefined}>
                <Input
                  {...fieldA11y("extend-hours", !valid ? "x" : undefined)}
                  inputMode="numeric"
                  dir="ltr"
                  value={hours}
                  onChange={(e) => setHours(e.target.value.replace(/\D/g, ""))}
                />
              </Field>
              {extend.error && <FormError>{errorMessage(extend.error)}</FormError>}
            </>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("common.close")}
            </Button>
            {!notConfigured && (
              <Button type="submit" disabled={!valid || extend.isPending}>
                {extend.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
                {t("reservations.extend")}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-2.5 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-end">{children}</dd>
    </div>
  );
}

function ReservationSheet({ reservation, onClose }: { reservation: Reservation | null; onClose: () => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const side = useEndSide();
  return (
    <Sheet open={reservation !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side={side} className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        {reservation && (
          <>
            <SheetHeader className="border-b">
              <SheetTitle>{t("reservations.detailTitle", { id: reservation.id })}</SheetTitle>
              <SheetDescription asChild>
                <div>
                  <ReservationStateBadge state={reservation.state} />
                </div>
              </SheetDescription>
            </SheetHeader>
            <dl className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
              <Row label={t("reservations.fields.unit")}>
                <Link href={`/units/${reservation.unit_id}`} className="text-primary hover:underline">
                  {t("common.unitRef", { id: reservation.unit_id })}
                </Link>
              </Row>
              <Row label={t("reservations.fields.client")}>{reservation.client_id ? t("common.clientRef", { id: reservation.client_id }) : "—"}</Row>
              <Row label={t("reservations.fields.fee")}>
                <span className="num">{formatMoney(reservation.payment_amount, locale)}</span>
              </Row>
              <Row label={t("reservations.fields.paymentStatus")}>{reservation.payment_status ?? "—"}</Row>
              <Row label={t("reservations.fields.expires")}>
                <Expires value={reservation.expires_at} />
              </Row>
              <Row label={t("reservations.fields.created")}>
                <span className="num">{formatDateTime(reservation.created_at, locale)}</span>
              </Row>
              {reservation.notes && <Row label={t("reservations.fields.notes")}>{reservation.notes}</Row>}
              {reservation.cancel_reason && <Row label={t("reservations.fields.cancelReason")}>{reservation.cancel_reason}</Row>}
            </dl>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// S11 — Reservations.
export function ReservationsView() {
  const t = useTranslations();
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const { can } = usePermissions();
  const canManage = can("sales.manage");
  const [state, setState] = useReservationsState();
  const list = useReservations(state);
  const cancel = useCancelReservation();
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [extending, setExtending] = useState<Reservation | null>(null);
  const [cancelling, setCancelling] = useState<Reservation | null>(null);
  const set = (patch: Partial<typeof state>) => setState({ ...patch, page: 1 });

  const columns: Column<Reservation>[] = [
    { id: "id", header: t("reservations.columns.id"), cell: (r) => <span className="num font-medium">{r.id}</span> },
    {
      id: "unit",
      header: t("reservations.columns.unit"),
      cell: (r) => (
        <Link href={`/units/${r.unit_id}`} onClick={(e) => e.stopPropagation()} className="num text-primary hover:underline">
          {t("common.unitRef", { id: r.unit_id })}
        </Link>
      ),
    },
    { id: "client", header: t("reservations.columns.client"), cell: (r) => <span className="num">{r.client_id ? t("common.clientRef", { id: r.client_id }) : "—"}</span> },
    { id: "state", header: t("reservations.columns.state"), cell: (r) => <ReservationStateBadge state={r.state} /> },
    { id: "fee", header: t("reservations.columns.fee"), align: "end", cell: (r) => <span className="num">{formatMoney(r.payment_amount, locale)}</span> },
    { id: "expires", header: t("reservations.columns.expires"), cell: (r) => (isOpen(r) ? <Expires value={r.expires_at} /> : "—") },
    {
      id: "actions",
      header: t("reservations.columns.actions"),
      cell: (r) =>
        canManage && isOpen(r) ? (
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setExtending(r);
              }}
            >
              <CalendarPlus data-icon="inline-start" />
              {t("reservations.extend")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setCancelling(r);
              }}
            >
              <XCircle data-icon="inline-start" />
              {t("reservations.cancel")}
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <>
      <FilterBar>
        <FilterSelect
          label={t("reservations.filters.state")}
          value={state.state}
          onChange={(v) => set({ state: v })}
          options={RESERVATION_STATES.map((s) => ({ value: s, label: t(`statuses.reservation.${s}`) }))}
        />
        <SearchFilter value={state.client} onChange={(v) => set({ client: v })} placeholder={t("reservations.filters.client")} inputMode="numeric" className="sm:w-44" />
        <SearchFilter value={state.unit} onChange={(v) => set({ unit: v })} placeholder={t("reservations.filters.unit")} inputMode="numeric" className="sm:w-44" />
        <ResetFilters
          count={[state.state, state.client, state.unit].filter(Boolean).length}
          onReset={() => setState({ state: null, client: null, unit: null, page: 1 })}
        />
      </FilterBar>
      <DataTable
        caption={t("reservations.title")}
        columns={columns}
        rows={list.data?.items}
        getRowId={(r) => r.id}
        getRowLabel={(r) => t("reservations.detailTitle", { id: r.id })}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        error={list.error}
        onRetry={() => list.refetch()}
        onRowClick={setSelected}
        pagination={paginationProps(list.data?.meta, setState)}
        empty={<EmptyState compact title={t("reservations.empty")} />}
      />
      <ReservationSheet reservation={selected} onClose={() => setSelected(null)} />
      {extending && <ExtendDialog reservation={extending} onClose={() => setExtending(null)} />}
      <ConfirmDialog
        open={cancelling !== null}
        onOpenChange={(o) => {
          if (!o) {
            setCancelling(null);
            cancel.reset();
          }
        }}
        title={cancelling ? t("reservations.cancelTitle", { id: cancelling.id }) : ""}
        consequence={t("reservations.cancelBody")}
        confirmLabel={t("reservations.cancel")}
        destructive
        requireReason
        pending={cancel.isPending}
        error={cancel.error ? errorMessage(cancel.error) : undefined}
        onConfirm={(reason) =>
          cancelling &&
          cancel.mutate(
            { id: cancelling.id, reason },
            {
              onSuccess: () => {
                toast.success(t("reservations.cancelled"));
                setCancelling(null);
              },
            },
          )
        }
      />
    </>
  );
}
