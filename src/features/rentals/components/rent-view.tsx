"use client";

import { Info, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type Column } from "@/components/shared/data-table/data-table";
import { paginationProps } from "@/components/shared/data-table/list-params";
import { FilterBar, FilterSelect, ResetFilters, SearchFilter } from "@/components/shared/filters";
import { Field } from "@/components/shared/form/field";
import { EmptyState, FormError } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/features/auth/hooks";
import { useErrorMessage } from "@/hooks/use-error-message";
import { toApiError } from "@/lib/api/errors";
import { formatDate, todayIso } from "@/lib/format/dates";
import { formatMoney } from "@/lib/format/money";
import { RENT_STATUSES, type RentItem } from "../api";
import { useRecordRent, useRentItems, useRentState, useWaiveRent } from "../hooks";
import { MandateScopeBanner, RentStatusBadge } from "./rental-shared";

function RecordDialog({ item, onClose }: { item: RentItem; onClose: () => void }) {
  const t = useTranslations();
  const errorMessage = useErrorMessage();
  const record = useRecordRent();
  const [paidOn, setPaidOn] = useState(todayIso());
  const [reference, setReference] = useState("");
  const future = paidOn > todayIso();
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!paidOn || future) return;
            record.mutate(
              { id: item.id, body: { paid_on: paidOn, reference: reference.trim() || undefined } },
              {
                onSuccess: () => {
                  toast.success(t("rent.recorded"));
                  onClose();
                },
              },
            );
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("rent.recordTitle")}</DialogTitle>
          </DialogHeader>
          <Field id="rr-date" label={t("rent.paidOn")} required error={future ? t("rent.paidOnFuture") : undefined}>
            <Input id="rr-date" type="date" dir="ltr" max={todayIso()} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
          </Field>
          <Field id="rr-ref" label={t("rent.reference")}>
            <Input id="rr-ref" dir="ltr" value={reference} onChange={(e) => setReference(e.target.value)} />
          </Field>
          {record.error && (
            <>
              <MandateScopeBanner error={record.error} />
              {toApiError(record.error).code !== "MANDATE_SCOPE" && <FormError>{errorMessage(record.error)}</FormError>}
            </>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={!paidOn || future || record.isPending}>
              {record.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {t("rent.record")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// S34 — Rent collection (tracking only; needs the collect_rent capability on the mandate).
export function RentView() {
  const t = useTranslations();
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const { can } = usePermissions();
  const canManage = can("rental.manage");
  const [state, setState] = useRentState();
  const list = useRentItems(state);
  const waive = useWaiveRent();
  const [recording, setRecording] = useState<RentItem | null>(null);
  const [waiving, setWaiving] = useState<RentItem | null>(null);
  const set = (patch: Partial<typeof state>) => setState({ ...patch, page: 1 });
  const open = (r: RentItem) => r.status === "pending" || r.status === "overdue";

  const columns: Column<RentItem>[] = [
    { id: "due", header: t("rent.columns.due"), cell: (r) => <span className="num">{formatDate(r.due_on, locale)}</span> },
    { id: "lease", header: t("rent.columns.lease"), cell: (r) => <span className="num">#{r.lease_id}</span> },
    { id: "amount", header: t("rent.columns.amount"), align: "end", cell: (r) => <span className="num">{formatMoney(r.amount, locale)}</span> },
    { id: "status", header: t("rent.columns.status"), cell: (r) => <RentStatusBadge status={r.status} /> },
    { id: "paid", header: t("rent.columns.paidOn"), cell: (r) => <span className="num text-muted-foreground">{formatDate(r.paid_on, locale)}</span> },
    { id: "ref", header: t("rent.columns.reference"), cell: (r) => <span dir="ltr">{r.reference ?? "—"}</span> },
    {
      id: "actions",
      header: t("rent.columns.actions"),
      cell: (r) =>
        canManage && open(r) ? (
          <div className="flex gap-1.5">
            <Button size="sm" onClick={() => setRecording(r)}>
              {t("rent.record")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setWaiving(r)}>
              {t("rent.waive")}
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <>
      <p className="flex items-center gap-2 rounded-lg border border-info/25 bg-info/5 px-3 py-2 text-sm text-info">
        <Info aria-hidden className="size-4 shrink-0" />
        {t("rent.subtitle")}
      </p>
      <FilterBar>
        <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-1.5">
          <Checkbox id="rent-overdue" checked={state.overdue} onCheckedChange={(v) => set({ overdue: v === true })} />
          <Label htmlFor="rent-overdue" className="text-sm">
            {t("rent.overdueOnly")}
          </Label>
        </div>
        {!state.overdue && (
          <FilterSelect
            label={t("rent.filters.status")}
            value={state.status}
            onChange={(v) => set({ status: v })}
            options={RENT_STATUSES.map((s) => ({ value: s, label: t(`statuses.rent.${s}`) }))}
          />
        )}
        <SearchFilter value={state.lease} onChange={(v) => set({ lease: v })} placeholder={t("rent.filters.lease")} inputMode="numeric" className="sm:w-40" />
        <ResetFilters
          count={[!state.overdue, state.status, state.lease].filter(Boolean).length}
          onReset={() => setState({ overdue: true, status: null, lease: null, page: 1 })}
        />
      </FilterBar>
      {waive.error && !waiving && <FormError>{errorMessage(waive.error)}</FormError>}
      <DataTable
        caption={t("rent.title")}
        columns={columns}
        rows={list.data?.items}
        getRowId={(r) => r.id}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        error={list.error}
        onRetry={() => list.refetch()}
        pagination={paginationProps(list.data?.meta, setState)}
        empty={<EmptyState compact title={t("rent.empty")} />}
      />
      {recording && <RecordDialog item={recording} onClose={() => setRecording(null)} />}
      <ConfirmDialog
        open={waiving !== null}
        onOpenChange={(o) => {
          if (!o) {
            setWaiving(null);
            waive.reset();
          }
        }}
        title={t("rent.waiveTitle")}
        consequence={t("rent.waiveBody")}
        confirmLabel={t("rent.waive")}
        destructive
        requireReason
        pending={waive.isPending}
        error={waive.error ? errorMessage(waive.error) : undefined}
        onConfirm={(reason) =>
          waiving &&
          waive.mutate(
            { id: waiving.id, reason },
            {
              onSuccess: () => {
                toast.success(t("rent.waived"));
                setWaiving(null);
              },
            },
          )
        }
      />
    </>
  );
}
