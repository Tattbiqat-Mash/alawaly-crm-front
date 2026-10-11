"use client";

import { CalendarClock, CircleSlash, ExternalLink, Loader2, Receipt, Upload } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { FileDrop } from "@/components/shared/file-drop";
import { Field } from "@/components/shared/form/field";
import { EmptyState, ErrorState, ForbiddenState, FormError, NotConfiguredState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { UnavailableAction } from "@/components/shared/unavailable-action";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { DOCUMENT_TYPES, installmentTone, isDocumentType, isHandoverStatus, isPaymentMethod } from "@/config/statuses";
import { usePermissions } from "@/features/auth/hooks";
import { useErrorMessage } from "@/hooks/use-error-message";
import { Link } from "@/i18n/navigation";
import { toApiError } from "@/lib/api/errors";
import { openSignedLink } from "@/lib/api/files";
import { useIdempotencyKey } from "@/lib/api/idempotency";
import { formatDate, formatDateTime, inputToApiTimestamp, todayIso } from "@/lib/format/dates";
import { isOn, localizedField } from "@/lib/format/localized";
import { formatMoney } from "@/lib/format/money";
import { salesApi } from "../api";
import {
  useApplyWarranties,
  useChangeInstallmentDate,
  useGenerateInstallments,
  useInitiatePayment,
  useInstallments,
  useSaleDocuments,
  useSaleHandovers,
  useSaleTransactions,
  useSaleWarranties,
  useScheduleHandover,
  useUploadDocument,
  useWarrantyPolicies,
} from "../hooks";
import type { Installment, Sale } from "../types";
import { PaymentStatusBadge } from "./badges";

type GatedQuery<T> = { allowed: boolean; data: T | undefined; isLoading: boolean; error: unknown; refetch: () => unknown };

function Gate<T>({ query, children, emptyWhen, empty }: { query: GatedQuery<T>; children: (d: T) => ReactNode; emptyWhen?: (d: T) => boolean; empty?: string }) {
  if (!query.allowed) return <ForbiddenState compact />;
  if (query.isLoading) return <Skeleton className="h-40 w-full" />;
  if (query.error) return <ErrorState compact error={query.error} onRetry={() => query.refetch()} />;
  if (!query.data) return null;
  if (emptyWhen?.(query.data) && empty) return <EmptyState compact title={empty} />;
  return <>{children(query.data)}</>;
}

// ---------------- Installments ----------------

// A special state (overdue / waived / refunded) wins over the plain status.
const INSTALLMENT_LABELS = ["pending", "paid", "canceled", "overdue", "waived", "refunded"] as const;

export function InstallmentsTab({ sale }: { sale: Sale }) {
  const t = useTranslations();
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const { can } = usePermissions();
  const canManage = can("sales.manage");
  const query = useInstallments(sale.id);
  const generate = useGenerateInstallments(sale.id);
  const [dateFor, setDateFor] = useState<Installment | null>(null);
  const [payFor, setPayFor] = useState<Installment | null>(null);
  const notConfigured = generate.error && toApiError(generate.error).code === "POLICY_NOT_CONFIGURED";
  const installmentLabel = (i: Installment) => {
    const key = i.state ?? i.status;
    return INSTALLMENT_LABELS.includes(key as (typeof INSTALLMENT_LABELS)[number]) ? t(`statuses.installment.${key as (typeof INSTALLMENT_LABELS)[number]}`) : key;
  };
  const anyPaid = (query.data?.items ?? []).some((i) => i.status === "paid");
  const live = sale.status !== "cancelled";

  return (
    <div className="grid gap-3">
      {notConfigured && <NotConfiguredState compact details={toApiError(generate.error).details} />}
      {generate.error && !notConfigured && <FormError>{errorMessage(generate.error)}</FormError>}
      {canManage && live && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            disabled={generate.isPending || anyPaid}
            onClick={() => generate.mutate(undefined, { onSuccess: () => toast.success(t("sale.installments.generated")) })}
          >
            {generate.isPending ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <CalendarClock data-icon="inline-start" />}
            {t("sale.installments.generate")}
          </Button>
          {anyPaid && <span className="text-xs text-muted-foreground">{t("sale.installments.regenerateBlocked")}</span>}
        </div>
      )}
      <Gate query={query} emptyWhen={(d) => d.items.length === 0} empty={t("sale.installments.empty")}>
        {(schedule) => (
          <div className="overflow-hidden rounded-xl border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("sale.installments.columns.title")}</TableHead>
                    <TableHead>{t("sale.installments.columns.due")}</TableHead>
                    <TableHead className="text-end">{t("sale.installments.columns.amount")}</TableHead>
                    <TableHead>{t("sale.installments.columns.status")}</TableHead>
                    <TableHead>{t("sale.installments.columns.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedule.items.map((i) => {
                    const statusLabel = installmentLabel(i);
                    const open = i.status === "pending" && live;
                    return (
                      <TableRow key={i.id}>
                        <TableCell>{localizedField(i, "payment_title", locale) || `#${i.id}`}</TableCell>
                        <TableCell className="num">{formatDate(i.date, locale)}</TableCell>
                        <TableCell className="num text-end">{formatMoney(i.amount, locale)}</TableCell>
                        <TableCell>
                          <StatusBadge tone={installmentTone(i.status, i.state)}>{statusLabel}</StatusBadge>
                        </TableCell>
                        <TableCell>
                          {canManage && open && (
                            <div className="flex flex-wrap gap-1.5">
                              <Button size="sm" variant="outline" onClick={() => setPayFor(i)}>
                                <Receipt data-icon="inline-start" />
                                {t("sale.installments.recordPayment")}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setDateFor(i)}>
                                {t("sale.installments.changeDate")}
                              </Button>
                              <UnavailableAction label={t("sale.installments.waive")} reason={t("sale.installments.waiveSoon")} icon={CircleSlash} variant="ghost" />
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {schedule.total !== null && (
              <p className="num border-t px-3 py-2 text-sm text-muted-foreground">
                {t("sale.installments.total", { total: formatMoney(schedule.total, locale), paid: formatMoney(schedule.paid, locale) })}
              </p>
            )}
          </div>
        )}
      </Gate>
      {dateFor && <ChangeDateDialog installment={dateFor} onClose={() => setDateFor(null)} />}
      {payFor && <RecordPaymentDialog installment={payFor} onClose={() => setPayFor(null)} />}
    </div>
  );
}

function ChangeDateDialog({ installment, onClose }: { installment: Installment; onClose: () => void }) {
  const t = useTranslations();
  const errorMessage = useErrorMessage();
  const change = useChangeInstallmentDate();
  const [date, setDate] = useState(installment.date);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            change.mutate(
              { id: installment.id, date },
              {
                onSuccess: () => {
                  toast.success(t("sale.installments.dateSaved"));
                  onClose();
                },
              },
            );
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("sale.installments.changeDateTitle")}</DialogTitle>
          </DialogHeader>
          <Field id="inst-date" label={t("sale.installments.newDate")} required>
            <Input id="inst-date" type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} required />
          </Field>
          {change.error && <FormError>{errorMessage(change.error)}</FormError>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={!date || date === installment.date || change.isPending}>
              {change.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Creates an offline payment for the installment; it is only "paid" after two confirmations (S17). */
function RecordPaymentDialog({ installment, onClose }: { installment: Installment; onClose: () => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const initiate = useInitiatePayment();
  const key = useIdempotencyKey();
  const title = localizedField(installment, "payment_title", locale) || `#${installment.id}`;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("sale.installments.recordTitle", { title })}</DialogTitle>
          <DialogDescription>{t("sale.installments.recordBody", { amount: formatMoney(installment.amount, locale) })}</DialogDescription>
        </DialogHeader>
        {initiate.data?.session.mode === "offline" && (
          <p className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground" dir="auto">
            {initiate.data.session.instructions}
          </p>
        )}
        {initiate.error && <FormError>{errorMessage(initiate.error)}</FormError>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("common.close")}
          </Button>
          {!initiate.data && (
            <Button
              disabled={initiate.isPending}
              onClick={() =>
                initiate.mutate(
                  { body: { provider: "offline", payment_id: installment.id }, key: key.key },
                  {
                    onSuccess: (r) => {
                      key.renew();
                      toast.success(t("sale.installments.recorded", { id: r.transaction.id }));
                    },
                    onError: (e) => {
                      if (toApiError(e).code === "IDEMPOTENCY_CONFLICT") key.renew();
                    },
                  },
                )
              }
            >
              {initiate.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {t("sale.installments.recordPayment")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------- Documents ----------------

const ACCEPT = ["application/pdf", "image/jpeg", "image/png"];
const MAX_BYTES = 10 * 1024 * 1024;

function formatBytes(size: number, locale: string) {
  const units = ["B", "KB", "MB"];
  let value = size;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${new Intl.NumberFormat(locale === "ar" ? "ar-SA-u-nu-latn" : "en", { maximumFractionDigits: 1 }).format(value)} ${units[i]}`;
}

export function DocumentsTab({ sale }: { sale: Sale }) {
  const t = useTranslations();
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const query = useSaleDocuments(sale.id);
  const upload = useUploadDocument(sale.id);
  const [type, setType] = useState<string>("contract");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | undefined>(undefined);
  const [openError, setOpenError] = useState<string | null>(null);

  const docLabel = (d: string) => (isDocumentType(d) ? t(`statuses.documentType.${d}`) : d);

  return (
    <div className="grid gap-4">
      {query.allowed && sale.status !== "cancelled" && (
        <form
          className="grid gap-3 rounded-xl border p-4 sm:grid-cols-[200px_1fr_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (!file) return;
            setProgress(0);
            upload.mutate(
              { type, file, onProgress: setProgress },
              {
                onSuccess: () => {
                  toast.success(t("sale.documents.uploaded"));
                  setFile(null);
                },
                onSettled: () => setProgress(undefined),
              },
            );
          }}
        >
          <Field id="doc-type" label={t("sale.documents.type")}>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="doc-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((d) => (
                  <SelectItem key={d} value={d}>
                    {docLabel(d)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <FileDrop accept={ACCEPT} maxBytes={MAX_BYTES} value={file} onChange={setFile} progress={progress} disabled={upload.isPending} labels={{
            prompt: t("sale.documents.drop.prompt"),
            hint: t("sale.documents.drop.hint"),
            remove: t("sale.documents.drop.remove"),
            tooLarge: t("sale.documents.drop.tooLarge"),
            wrongType: t("sale.documents.drop.wrongType"),
          }} />
          <Button type="submit" disabled={!file || upload.isPending}>
            {upload.isPending ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Upload data-icon="inline-start" />}
            {upload.isPending ? t("sale.documents.uploading") : t("sale.documents.upload")}
          </Button>
          {upload.error && <div className="sm:col-span-3"><FormError>{errorMessage(upload.error)}</FormError></div>}
        </form>
      )}
      {openError && <FormError>{openError}</FormError>}
      <Gate query={query} emptyWhen={(d) => d.length === 0} empty={t("sale.documents.empty")}>
        {(docs) => (
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("sale.documents.columns.type")}</TableHead>
                  <TableHead>{t("sale.documents.columns.version")}</TableHead>
                  <TableHead>{t("sale.documents.columns.file")}</TableHead>
                  <TableHead>{t("sale.documents.columns.size")}</TableHead>
                  <TableHead>{t("sale.documents.columns.added")}</TableHead>
                  <TableHead>{t("sale.documents.columns.open")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((d) => (
                  <TableRow key={d.id} className={d.superseded_by ? "text-muted-foreground" : undefined}>
                    <TableCell>
                      {docLabel(d.type)} {d.superseded_by ? <StatusBadge className="ms-1">{t("sale.documents.superseded")}</StatusBadge> : null}
                    </TableCell>
                    <TableCell className="num">v{d.version}</TableCell>
                    <TableCell className="max-w-56 truncate" dir="ltr">{d.original_name}</TableCell>
                    <TableCell className="num">{formatBytes(d.size, locale)}</TableCell>
                    <TableCell className="num">{formatDateTime(d.created_at, locale)}</TableCell>
                    <TableCell>
                      {/* Private file: a fresh signed link (valid 10 minutes) on every click. */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setOpenError(null);
                          openSignedLink(() => salesApi.documentLink(sale.id, d.id)).catch((e) => setOpenError(errorMessage(e)));
                        }}
                      >
                        <ExternalLink data-icon="inline-start" />
                        {t("sale.documents.openFile")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Gate>
    </div>
  );
}

// ---------------- Handover ----------------

export function HandoverTab({ sale }: { sale: Sale }) {
  const t = useTranslations();
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const { can } = usePermissions();
  const handovers = useSaleHandovers(sale.id);
  const schedule = useScheduleHandover(sale.id);
  const [when, setWhen] = useState("");
  const [notes, setNotes] = useState("");
  const existing = handovers.data?.[0];
  const canSchedule = can("handover.manage") && (sale.status === "contracted" || sale.status === "paid_up");

  return (
    <Gate query={handovers}>
      {() =>
        existing ? (
          <div className="grid gap-3 rounded-xl border p-4">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge tone="info">{isHandoverStatus(existing.status) ? t(`statuses.handover.${existing.status}`) : existing.status}</StatusBadge>
              <span className="num text-sm">{formatDateTime(existing.scheduled_at, locale)}</span>
            </div>
            {existing.notes && <p className="text-sm text-muted-foreground">{existing.notes}</p>}
            <p className="text-sm text-muted-foreground">{t("sale.handover.exists")}</p>
            <Button variant="outline" className="justify-self-start" asChild>
              <Link href={`/handovers/${existing.id}`}>{t("common.open")}</Link>
            </Button>
          </div>
        ) : !canSchedule ? (
          <EmptyState compact title={t("sale.handover.needsContract")} />
        ) : (
          <form
            className="grid max-w-lg gap-4 rounded-xl border p-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!when) return;
              schedule.mutate(
                { scheduled_at: inputToApiTimestamp(when), notes: notes.trim() || undefined },
                { onSuccess: () => toast.success(t("sale.handover.scheduled")) },
              );
            }}
          >
            <Field id="ho-when" label={t("sale.handover.when")} required>
              <Input id="ho-when" type="datetime-local" dir="ltr" min={`${todayIso()}T00:00`} value={when} onChange={(e) => setWhen(e.target.value)} required />
            </Field>
            <Field id="ho-notes" label={t("sale.handover.notes")}>
              <Textarea id="ho-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            {schedule.error && <FormError>{errorMessage(schedule.error)}</FormError>}
            <Button type="submit" className="justify-self-start" disabled={!when || schedule.isPending}>
              {schedule.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {t("sale.handover.schedule")}
            </Button>
          </form>
        )
      }
    </Gate>
  );
}

// ---------------- Warranty ----------------

export function WarrantyTab({ sale }: { sale: Sale }) {
  const t = useTranslations();
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const policies = useWarrantyPolicies();
  const applied = useSaleWarranties(sale.id);
  const apply = useApplyWarranties(sale.id);
  const [selected, setSelected] = useState<number[]>([]);
  const appliedPolicyIds = new Set((applied.data ?? []).map((w) => w.policy_id));

  if (!policies.allowed) return <EmptyState compact title={t("sale.warranty.noPermission")} />;

  return (
    <Gate query={policies} emptyWhen={(d) => d.length === 0} empty={t("sale.warranty.empty")}>
      {(list) => (
        <div className="grid max-w-2xl gap-3">
          <ul className="divide-y rounded-xl border">
            {list.filter((p) => isOn(p.active)).map((p) => {
              const done = appliedPolicyIds.has(p.id);
              const warranty = applied.data?.find((w) => w.policy_id === p.id);
              const id = `policy-${p.id}`;
              return (
                <li key={p.id} className="flex items-center gap-3 p-3">
                  <Checkbox
                    id={id}
                    checked={done || selected.includes(p.id)}
                    disabled={done || apply.isPending || sale.status === "cancelled"}
                    onCheckedChange={(v) => setSelected((s) => (v === true ? [...s, p.id] : s.filter((x) => x !== p.id)))}
                  />
                  <Label htmlFor={id} className="flex flex-1 flex-col items-start gap-0.5">
                    <span>{localizedField(p, "name", locale) || `#${p.id}`}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {p.months ? t("sale.warranty.months", { months: p.months }) : "—"} ·{" "}
                      {p.transferable === null ? t("sale.warranty.transferable.undecided") : isOn(p.transferable) ? t("sale.warranty.transferable.yes") : t("sale.warranty.transferable.no")}
                    </span>
                  </Label>
                  {warranty && (
                    <span className="num text-xs text-muted-foreground">
                      {formatDate(warranty.starts_on, locale)} → {formatDate(warranty.expires_on, locale)}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          {apply.error && <FormError>{errorMessage(apply.error)}</FormError>}
          <Button
            className="justify-self-start"
            disabled={selected.length === 0 || apply.isPending}
            onClick={() =>
              apply.mutate(selected, {
                onSuccess: (r) => {
                  toast.success(t("sale.warranty.applied", { count: Array.isArray(r) ? r.length : selected.length }));
                  setSelected([]);
                },
              })
            }
          >
            {apply.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
            {t("sale.warranty.apply")}
          </Button>
        </div>
      )}
    </Gate>
  );
}

// ---------------- Payments ----------------

export function PaymentsTab({ sale }: { sale: Sale }) {
  const t = useTranslations();
  const locale = useLocale();
  const query = useSaleTransactions(sale.id);
  if (!query.allowed) return <EmptyState compact title={t("sale.payments.noPermission")} />;
  return (
    <Gate query={query} emptyWhen={(d) => d.items.length === 0} empty={t("sale.payments.empty")}>
      {(page) => (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>{t("payments.columns.type")}</TableHead>
                <TableHead className="text-end">{t("payments.columns.amount")}</TableHead>
                <TableHead>{t("payments.columns.method")}</TableHead>
                <TableHead>{t("payments.columns.status")}</TableHead>
                <TableHead>{t("payments.columns.date")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.items.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="num">{tx.id}</TableCell>
                  <TableCell>{tx.type === "refund" ? t("statuses.paymentType.refund") : t("statuses.paymentType.payment")}</TableCell>
                  <TableCell className="num text-end">{formatMoney(tx.amount, locale, tx.currency)}</TableCell>
                  <TableCell>{isPaymentMethod(tx.method) ? t(`statuses.paymentMethod.${tx.method}`) : (tx.method ?? "—")}</TableCell>
                  <TableCell>
                    <PaymentStatusBadge status={tx.status} />
                  </TableCell>
                  <TableCell className="num">{formatDateTime(tx.created_at, locale)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Gate>
  );
}

