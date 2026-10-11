"use client";

import { ClipboardCheck, Loader2, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type Column } from "@/components/shared/data-table/data-table";
import { paginationProps } from "@/components/shared/data-table/list-params";
import { FilterBar, FilterSelect, ResetFilters, SearchFilter } from "@/components/shared/filters";
import { Field } from "@/components/shared/form/field";
import { FormSheet } from "@/components/shared/form/form-sheet";
import { EmptyState, ErrorState, FormError } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { usePermissions } from "@/features/auth/hooks";
import { useEndSide } from "@/hooks/use-end-side";
import { useErrorMessage } from "@/hooks/use-error-message";
import { toApiError } from "@/lib/api/errors";
import { useIdempotencyKey } from "@/lib/api/idempotency";
import { formatDate, todayIso } from "@/lib/format/dates";
import { formatMoney, fromMinor, toMinor } from "@/lib/format/money";
import { FREQUENCIES, INSPECTION_TYPES, LEASE_STATUSES, type Lease } from "../api";
import { useAllMandates, useAllTenants, useCreateLease, useLease, useLeaseAction, useLeases, useLeasesState, useRecordInspection } from "../hooks";
import { LeaseStatusBadge, MandateScopeBanner, RentStatusBadge, useRentalLabels } from "./rental-shared";

const AMOUNT = /^\d+(\.\d{1,2})?$/;
const money = (v: string) => fromMinor(toMinor(v)!);

function NewLeaseSheet({ onClose }: { onClose: () => void }) {
  const t = useTranslations();
  const labels = useRentalLabels();
  const errorMessage = useErrorMessage();
  const mandates = useAllMandates();
  const create = useCreateLease();
  const idempotency = useIdempotencyKey();
  const [v, setV] = useState({ mandate: "", tenant: "", start: todayIso(), end: "", rent: "", frequency: "monthly", deposit: "" });
  const tenants = useAllTenants(v.mandate ? Number(v.mandate) : null);
  const [submitted, setSubmitted] = useState(false);
  const required = t("validation.required");
  const endOk = v.end > v.start;
  const ok = v.mandate && v.tenant && v.start && endOk && AMOUNT.test(v.rent) && (!v.deposit || AMOUNT.test(v.deposit));

  return (
    <FormSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={t("leases.new")}
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
        if (!ok) return;
        create.mutate(
          {
            mandateId: Number(v.mandate),
            body: {
              tenant_id: Number(v.tenant),
              start_date: v.start,
              end_date: v.end,
              rent_amount: money(v.rent),
              rent_frequency: v.frequency,
              ...(v.deposit ? { deposit: money(v.deposit) } : {}),
            },
            key: idempotency.key,
          },
          {
            onSuccess: () => {
              idempotency.renew();
              toast.success(t("leases.created"));
              onClose();
            },
            onError: (err) => {
              if (toApiError(err).code === "IDEMPOTENCY_CONFLICT") idempotency.renew();
            },
          },
        );
      }}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
            {t("common.create")}
          </Button>
        </>
      }
    >
      <fieldset disabled={create.isPending} className="grid gap-4">
        <Field id="ls-mandate" label={t("leases.fields.mandate")} required error={submitted && !v.mandate ? required : undefined}>
          <Select value={v.mandate} onValueChange={(mandate) => setV({ ...v, mandate, tenant: "" })}>
            <SelectTrigger id="ls-mandate" className="w-full">
              <SelectValue placeholder={t("rentals.pickMandate")} />
            </SelectTrigger>
            <SelectContent>
              {(mandates.data ?? []).filter((m) => m.status === "active").map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {t("rentals.mandateLabel", { id: m.id, unit: m.unit_id, mode: labels.mode(m.mode) })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id="ls-tenant" label={t("leases.fields.tenant")} required error={submitted && !v.tenant ? required : undefined}>
          <Select value={v.tenant} onValueChange={(tenant) => setV({ ...v, tenant })} disabled={!v.mandate}>
            <SelectTrigger id="ls-tenant" className="w-full">
              <SelectValue placeholder={t("leases.fields.tenant")} />
            </SelectTrigger>
            <SelectContent>
              {(tenants.data ?? []).map((x) => (
                <SelectItem key={x.id} value={String(x.id)}>
                  {x.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="ls-start" label={t("leases.fields.start")} required>
            <Input id="ls-start" type="date" dir="ltr" value={v.start} onChange={(e) => setV({ ...v, start: e.target.value })} />
          </Field>
          <Field id="ls-end" label={t("leases.fields.end")} required error={submitted && !endOk ? t("leases.endAfterStart") : undefined}>
            <Input id="ls-end" type="date" dir="ltr" min={v.start} value={v.end} onChange={(e) => setV({ ...v, end: e.target.value })} />
          </Field>
          <Field id="ls-rent" label={t("leases.fields.rent")} required error={submitted && !AMOUNT.test(v.rent) ? t("newSale.priceInvalid") : undefined}>
            <Input id="ls-rent" inputMode="decimal" dir="ltr" value={v.rent} onChange={(e) => setV({ ...v, rent: e.target.value.replace(/[^\d.]/g, "") })} />
          </Field>
          <Field id="ls-freq" label={t("leases.fields.frequency")}>
            <Select value={v.frequency} onValueChange={(frequency) => setV({ ...v, frequency })}>
              <SelectTrigger id="ls-freq" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCIES.map((f) => (
                  <SelectItem key={f} value={f}>
                    {labels.frequency(f)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="ls-deposit" label={t("leases.fields.deposit")}>
            <Input id="ls-deposit" inputMode="decimal" dir="ltr" value={v.deposit} onChange={(e) => setV({ ...v, deposit: e.target.value.replace(/[^\d.]/g, "") })} />
          </Field>
        </div>
      </fieldset>
      {create.error && (
        <>
          <MandateScopeBanner error={create.error} />
          {toApiError(create.error).code !== "MANDATE_SCOPE" && <FormError>{errorMessage(create.error)}</FormError>}
        </>
      )}
    </FormSheet>
  );
}

function RenewDialog({ lease, onClose }: { lease: Lease; onClose: () => void }) {
  const t = useTranslations();
  const errorMessage = useErrorMessage();
  const act = useLeaseAction();
  const [end, setEnd] = useState("");
  const [rent, setRent] = useState("");
  const ok = end > lease.end_date && (!rent || AMOUNT.test(rent));
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!ok) return;
            act.mutate(
              { id: lease.id, action: "renew", body: { end_date: end, ...(rent ? { rent_amount: money(rent) } : {}) } },
              {
                onSuccess: (next) => {
                  toast.success(t("leases.renewed", { id: next.id }));
                  onClose();
                },
              },
            );
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("leases.renewTitle", { id: lease.id })}</DialogTitle>
            <DialogDescription>{t("leases.renewBody")}</DialogDescription>
          </DialogHeader>
          <Field id="rn-end" label={t("leases.newEnd")} required>
            <Input id="rn-end" type="date" dir="ltr" min={lease.end_date} value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
          <Field id="rn-rent" label={t("leases.newRent")}>
            <Input id="rn-rent" inputMode="decimal" dir="ltr" value={rent} onChange={(e) => setRent(e.target.value.replace(/[^\d.]/g, ""))} />
          </Field>
          {act.error && <FormError>{errorMessage(act.error)}</FormError>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={!ok || act.isPending}>
              {act.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {t("leases.renew")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InspectionDialog({ lease, onClose }: { lease: Lease; onClose: () => void }) {
  const t = useTranslations();
  const errorMessage = useErrorMessage();
  const record = useRecordInspection();
  const idempotency = useIdempotencyKey();
  const [type, setType] = useState<string>("periodic");
  const [date, setDate] = useState(todayIso());
  const [rows, setRows] = useState([{ room: "", condition: "" }]);
  const [notes, setNotes] = useState("");
  const items = rows.filter((r) => r.room.trim() && r.condition.trim());
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            record.mutate(
              { id: lease.id, body: { type, inspected_on: date, items, notes: notes.trim() || undefined }, key: idempotency.key },
              {
                onSuccess: () => {
                  idempotency.renew();
                  toast.success(t("leases.inspected"));
                  onClose();
                },
              },
            );
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("leases.inspectTitle")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="in-type" label={t("leases.inspectionType")}>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="in-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INSPECTION_TYPES.map((x) => (
                    <SelectItem key={x} value={x}>
                      {t(`statuses.inspection.${x}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="in-date" label={t("leases.inspectedOn")}>
              <Input id="in-date" type="date" dir="ltr" max={todayIso()} value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
          <div className="grid gap-2">
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <Input aria-label={t("leases.room")} placeholder={t("leases.room")} value={r.room} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, room: e.target.value } : x)))} />
                <Input
                  aria-label={t("leases.condition")}
                  placeholder={t("leases.condition")}
                  value={r.condition}
                  onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, condition: e.target.value } : x)))}
                />
                <Button type="button" variant="ghost" size="icon" aria-label={t("handover.removeSnagRow")} onClick={() => setRows(rows.filter((_, j) => j !== i))}>
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => setRows([...rows, { room: "", condition: "" }])}>
              <Plus data-icon="inline-start" />
              {t("leases.addRoom")}
            </Button>
          </div>
          <Field id="in-notes" label={t("leases.inspectionNotes")}>
            <Textarea id="in-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          {record.error && <FormError>{errorMessage(record.error)}</FormError>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={record.isPending}>
              {record.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {t("leases.inspect")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LeaseSheet({ leaseId, onClose }: { leaseId: number; onClose: () => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const side = useEndSide();
  const labels = useRentalLabels();
  const errorMessage = useErrorMessage();
  const { can } = usePermissions();
  const canManage = can("rental.manage");
  const query = useLease(leaseId);
  const act = useLeaseAction();
  const [dialog, setDialog] = useState<"end" | "terminate" | "renew" | "inspect" | null>(null);
  const l = query.data;
  const run = (action: "activate" | "end" | "terminate", body?: Record<string, unknown>) =>
    act.mutate(
      { id: leaseId, action, body },
      {
        onSuccess: () => {
          toast.success(t(action === "activate" ? "leases.activated" : action === "end" ? "leases.ended" : "leases.terminated"));
          setDialog(null);
        },
      },
    );

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side={side} className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
        <SheetHeader className="border-b">
          <SheetTitle>{t("leases.detailTitle", { id: leaseId })}</SheetTitle>
          <SheetDescription asChild>
            <div className="flex flex-wrap items-center gap-2">
              {l && <LeaseStatusBadge status={l.status} />}
              {l && (
                <span className="num">
                  {formatDate(l.start_date, locale)} → {formatDate(l.end_date, locale)} · {formatMoney(l.rent_amount, locale)} / {labels.frequency(l.rent_frequency)}
                </span>
              )}
            </div>
          </SheetDescription>
        </SheetHeader>
        <div className="grid min-h-0 flex-1 content-start gap-4 overflow-y-auto p-4">
          {query.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : query.error || !l ? (
            <ErrorState compact error={query.error} onRetry={() => query.refetch()} />
          ) : (
            <>
              {canManage && (
                <div className="flex flex-wrap gap-2">
                  {l.status === "draft" && (
                    <Button disabled={act.isPending} onClick={() => run("activate")}>
                      {act.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
                      {t("leases.activate")}
                    </Button>
                  )}
                  {l.status === "active" && (
                    <>
                      <Button variant="outline" onClick={() => setDialog("renew")}>
                        {t("leases.renew")}
                      </Button>
                      <Button variant="outline" onClick={() => setDialog("inspect")}>
                        <ClipboardCheck data-icon="inline-start" />
                        {t("leases.inspect")}
                      </Button>
                      <Button variant="outline" onClick={() => setDialog("end")}>
                        {t("leases.end")}
                      </Button>
                      <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDialog("terminate")}>
                        {t("leases.terminate")}
                      </Button>
                    </>
                  )}
                </div>
              )}
              {act.error && !dialog && (
                <>
                  <MandateScopeBanner error={act.error} />
                  {toApiError(act.error).code !== "MANDATE_SCOPE" && <FormError>{errorMessage(act.error)}</FormError>}
                </>
              )}
              <Tabs defaultValue="schedule" className="gap-3">
                <TabsList>
                  <TabsTrigger value="schedule">{t("leases.tabs.schedule")}</TabsTrigger>
                  <TabsTrigger value="inspections">{t("leases.tabs.inspections")}</TabsTrigger>
                </TabsList>
                <TabsContent value="schedule">
                  {l.schedule.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("leases.noSchedule")}</p>
                  ) : (
                    <ul className="divide-y rounded-xl border text-sm">
                      {l.schedule.map((r) => (
                        <li key={r.id} className="flex items-center justify-between gap-2 px-3 py-2">
                          <span className="num">{formatDate(r.due_on, locale)}</span>
                          <span className="num">{formatMoney(r.amount, locale)}</span>
                          <RentStatusBadge status={r.status} />
                        </li>
                      ))}
                    </ul>
                  )}
                </TabsContent>
                <TabsContent value="inspections">
                  {l.inspections.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("leases.noInspections")}</p>
                  ) : (
                    <ul className="grid gap-2">
                      {l.inspections.map((i) => (
                        <li key={i.id} className="rounded-xl border p-3 text-sm">
                          <p className="font-medium">
                            {(INSPECTION_TYPES as readonly string[]).includes(i.type) ? t(`statuses.inspection.${i.type as (typeof INSPECTION_TYPES)[number]}`) : i.type} ·{" "}
                            <span className="num">{formatDate(i.inspected_on, locale)}</span>
                          </p>
                          <ul className="mt-1 text-muted-foreground">
                            {i.items.map((it, j) => (
                              <li key={j}>
                                {it.room}: {it.condition}
                              </li>
                            ))}
                          </ul>
                          {i.notes && <p className="mt-1">{i.notes}</p>}
                        </li>
                      ))}
                    </ul>
                  )}
                </TabsContent>
              </Tabs>
              {dialog === "renew" && <RenewDialog lease={l} onClose={() => setDialog(null)} />}
              {dialog === "inspect" && <InspectionDialog lease={l} onClose={() => setDialog(null)} />}
              <ConfirmDialog
                open={dialog === "end" || dialog === "terminate"}
                onOpenChange={(o) => {
                  if (!o) {
                    setDialog(null);
                    act.reset();
                  }
                }}
                title={dialog === "terminate" ? t("leases.terminateTitle", { id: l.id }) : t("leases.endTitle", { id: l.id })}
                consequence={dialog === "terminate" ? t("leases.terminateBody") : t("leases.endBody")}
                confirmLabel={dialog === "terminate" ? t("leases.terminate") : t("leases.end")}
                destructive={dialog === "terminate"}
                requireReason={dialog === "terminate"}
                pending={act.isPending}
                error={act.error ? errorMessage(act.error) : undefined}
                onConfirm={(reason) => (dialog === "terminate" ? run("terminate", { reason }) : run("end"))}
              />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// S33 — Leases.
export function LeasesView() {
  const t = useTranslations();
  const locale = useLocale();
  const labels = useRentalLabels();
  const { can } = usePermissions();
  const [state, setState] = useLeasesState();
  const list = useLeases(state);
  const [creating, setCreating] = useState(false);
  const set = (patch: Partial<typeof state>) => setState({ ...patch, page: 1 });

  const columns: Column<Lease>[] = [
    { id: "id", header: t("leases.columns.id"), cell: (l) => <span className="num font-medium">{l.id}</span> },
    { id: "unit", header: t("leases.columns.unit"), cell: (l) => <span className="num">{t("common.unitRef", { id: l.unit_id })}</span> },
    { id: "tenant", header: t("leases.columns.tenant"), cell: (l) => <span className="num">#{l.tenant_id}</span> },
    { id: "period", header: t("leases.columns.period"), cell: (l) => <span className="num text-xs">{formatDate(l.start_date, locale)} → {formatDate(l.end_date, locale)}</span> },
    { id: "rent", header: t("leases.columns.rent"), align: "end", cell: (l) => <span className="num">{formatMoney(l.rent_amount, locale)}</span> },
    { id: "frequency", header: t("leases.columns.frequency"), cell: (l) => labels.frequency(l.rent_frequency) },
    { id: "status", header: t("leases.columns.status"), cell: (l) => <LeaseStatusBadge status={l.status} /> },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FilterBar>
          <FilterSelect
            label={t("leases.filters.status")}
            value={state.status}
            onChange={(v) => set({ status: v })}
            options={LEASE_STATUSES.map((s) => ({ value: s, label: t(`statuses.lease.${s}`) }))}
          />
          <SearchFilter value={state.mandate} onChange={(v) => set({ mandate: v })} placeholder={t("leases.filters.mandate")} inputMode="numeric" className="sm:w-44" />
          <ResetFilters count={[state.status, state.mandate].filter(Boolean).length} onReset={() => setState({ status: null, mandate: null, page: 1 })} />
        </FilterBar>
        {can("rental.manage") && (
          <Button onClick={() => setCreating(true)}>
            <Plus data-icon="inline-start" />
            {t("leases.new")}
          </Button>
        )}
      </div>
      <DataTable
        caption={t("leases.title")}
        columns={columns}
        rows={list.data?.items}
        getRowId={(l) => l.id}
        getRowLabel={(l) => t("leases.detailTitle", { id: l.id })}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        error={list.error}
        onRetry={() => list.refetch()}
        onRowClick={(l) => setState({ open: l.id })}
        pagination={paginationProps(list.data?.meta, setState)}
        empty={<EmptyState compact title={t("leases.empty")} />}
      />
      {creating && <NewLeaseSheet onClose={() => setCreating(false)} />}
      {state.open !== null && <LeaseSheet key={state.open} leaseId={state.open} onClose={() => setState({ open: null })} />}
    </>
  );
}
