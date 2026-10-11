"use client";

import { ArrowRight, CalendarClock, Check, ClipboardCheck, Info, Loader2, Lock, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Field } from "@/components/shared/form/field";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, FormError } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { usePermissions } from "@/features/auth/hooks";
import { useErrorMessage } from "@/hooks/use-error-message";
import { Link } from "@/i18n/navigation";
import { formatDateTime, inputToApiTimestamp, todayIso } from "@/lib/format/dates";
import { cn } from "@/lib/utils";
import { SEVERITIES, type Handover, type Severity, type SnagInput } from "../api";
import { useAddSnag, useCloseHandover, useHandover, useInspect, useReschedule, useUpdateSnag } from "../hooks";
import { HandoverStatusBadge, SeverityBadge, SnagStatusBadge } from "./handover-badges";

const FLOW = ["scheduled", "inspected", "accepted", "closed"] as const;
const stepIndex = (status: string) => (status === "accepted_with_snags" ? 2 : FLOW.indexOf(status as (typeof FLOW)[number]));
const isAccepted = (h: Handover) => h.status === "accepted" || h.status === "accepted_with_snags";

function Stepper({ status }: { status: string }) {
  const t = useTranslations("handover.steps");
  const current = stepIndex(status);
  return (
    <ol className="flex flex-wrap items-center gap-2">
      {FLOW.map((step, i) => (
        <li key={step} className="flex items-center gap-2">
          <span
            aria-current={current === i ? "step" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
              current > i && "border-success/30 bg-success/10 text-success",
              current === i && "border-primary/40 bg-primary/10 text-primary",
              current < i && "text-muted-foreground",
            )}
          >
            {current > i && <Check aria-hidden className="size-3" />}
            {t(step)}
          </span>
          {i < FLOW.length - 1 && <ArrowRight aria-hidden className="size-3 text-muted-foreground rtl:rotate-180" />}
        </li>
      ))}
    </ol>
  );
}

function SeveritySelect({ id, value, onChange }: { id: string; value: Severity; onChange: (v: Severity) => void }) {
  const t = useTranslations("statuses.severity");
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Severity)}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SEVERITIES.map((s) => (
          <SelectItem key={s} value={s}>
            {t(s)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function RescheduleDialog({ handover, onClose }: { handover: Handover; onClose: () => void }) {
  const t = useTranslations();
  const errorMessage = useErrorMessage();
  const reschedule = useReschedule(handover.id);
  const [when, setWhen] = useState(handover.scheduled_at ? handover.scheduled_at.slice(0, 16).replace(" ", "T") : "");
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            reschedule.mutate(inputToApiTimestamp(when), {
              onSuccess: () => {
                toast.success(t("handover.rescheduled"));
                onClose();
              },
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("handover.rescheduleTitle")}</DialogTitle>
          </DialogHeader>
          <Field id="rs-when" label={t("sale.handover.when")} required>
            <Input id="rs-when" type="datetime-local" dir="ltr" min={`${todayIso()}T00:00`} value={when} onChange={(e) => setWhen(e.target.value)} required />
          </Field>
          {reschedule.error && <FormError>{errorMessage(reschedule.error)}</FormError>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={!when || reschedule.isPending}>
              {reschedule.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const emptySnag = (): SnagInput => ({ area: "", description: "", severity: "minor" });

function InspectDialog({ handover, onClose }: { handover: Handover; onClose: () => void }) {
  const t = useTranslations();
  const errorMessage = useErrorMessage();
  const inspect = useInspect(handover.id);
  const [items, setItems] = useState<SnagInput[]>([]);
  const [notes, setNotes] = useState("");
  const valid = items.every((i) => i.area.trim() && i.description.trim());
  const update = (index: number, patch: Partial<SnagInput>) => setItems((list) => list.map((it, i) => (i === index ? { ...it, ...patch } : it)));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid) return;
            inspect.mutate(
              { items: items.map((i) => ({ ...i, area: i.area.trim(), description: i.description.trim() })), notes: notes.trim() || undefined },
              {
                onSuccess: () => {
                  toast.success(t("handover.inspected"));
                  onClose();
                },
              },
            );
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("handover.inspectTitle")}</DialogTitle>
            <DialogDescription>{t("handover.inspectBody")}</DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[50vh] gap-3 overflow-y-auto">
            {items.map((item, i) => (
              <fieldset key={i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_2fr_140px_auto] sm:items-end">
                <Field id={`sn-area-${i}`} label={t("handover.area")} required>
                  <Input id={`sn-area-${i}`} value={item.area} onChange={(e) => update(i, { area: e.target.value })} />
                </Field>
                <Field id={`sn-desc-${i}`} label={t("handover.description")} required>
                  <Input id={`sn-desc-${i}`} value={item.description} onChange={(e) => update(i, { description: e.target.value })} />
                </Field>
                <Field id={`sn-sev-${i}`} label={t("handover.severity")}>
                  <SeveritySelect id={`sn-sev-${i}`} value={item.severity} onChange={(severity) => update(i, { severity })} />
                </Field>
                <Button type="button" variant="ghost" size="icon" aria-label={t("handover.removeSnagRow")} onClick={() => setItems((l) => l.filter((_, x) => x !== i))}>
                  <Trash2 />
                </Button>
              </fieldset>
            ))}
            <Button type="button" variant="outline" className="justify-self-start" onClick={() => setItems((l) => [...l, emptySnag()])}>
              <Plus data-icon="inline-start" />
              {t("handover.addSnagRow")}
            </Button>
          </div>
          <Field id="insp-notes" label={t("handover.inspectionNotes")}>
            <Textarea id="insp-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          {inspect.error && <FormError>{errorMessage(inspect.error)}</FormError>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={!valid || inspect.isPending}>
              {inspect.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {t("handover.inspect")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddSnagForm({ handoverId }: { handoverId: number }) {
  const t = useTranslations();
  const errorMessage = useErrorMessage();
  const add = useAddSnag(handoverId);
  const [snag, setSnag] = useState<SnagInput>(emptySnag);
  return (
    <form
      className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_2fr_140px_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        if (!snag.area.trim() || !snag.description.trim()) return;
        add.mutate(
          { ...snag, area: snag.area.trim(), description: snag.description.trim() },
          {
            onSuccess: () => {
              toast.success(t("handover.snagAdded"));
              setSnag(emptySnag());
            },
          },
        );
      }}
    >
      <Field id="add-area" label={t("handover.area")} required>
        <Input id="add-area" value={snag.area} onChange={(e) => setSnag({ ...snag, area: e.target.value })} />
      </Field>
      <Field id="add-desc" label={t("handover.description")} required>
        <Input id="add-desc" value={snag.description} onChange={(e) => setSnag({ ...snag, description: e.target.value })} />
      </Field>
      <Field id="add-sev" label={t("handover.severity")}>
        <SeveritySelect id="add-sev" value={snag.severity} onChange={(severity) => setSnag({ ...snag, severity })} />
      </Field>
      <Button type="submit" disabled={add.isPending || !snag.area.trim() || !snag.description.trim()}>
        {add.isPending ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Plus data-icon="inline-start" />}
        {t("handover.addSnag")}
      </Button>
      {add.error && (
        <div className="sm:col-span-4">
          <FormError>{errorMessage(add.error)}</FormError>
        </div>
      )}
    </form>
  );
}

// S21 — Handover detail. Staff inspect and close; only the owner accepts (owner portal).
export function HandoverDetail({ id }: { id: number }) {
  const t = useTranslations();
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const { can } = usePermissions();
  const canManage = can("handover.manage");
  const query = useHandover(id);
  const updateSnag = useUpdateSnag();
  const close = useCloseHandover(id);
  const [dialog, setDialog] = useState<"reschedule" | "inspect" | "close" | null>(null);

  const crumbs = [{ label: t("nav.groups.sales") }, { label: t("nav.items.handovers"), href: "/handovers" }, { label: `#${id}` }];
  if (query.isLoading) return <Skeleton className="h-96 w-full" />;
  if (query.error || !query.data) {
    return (
      <>
        <PageHeader title={t("handover.title", { id })} breadcrumbs={crumbs} breadcrumbsLabel={t("common.breadcrumbs")} />
        <div className="rounded-xl border bg-card">
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        </div>
      </>
    );
  }

  const h = query.data;
  const snags = h.items ?? [];
  const openSnags = snags.filter((s) => s.status === "open").length;
  const closed = h.status === "closed";
  const canClose = isAccepted(h) && openSnags === 0;

  return (
    <>
      <PageHeader
        title={t("handover.title", { id })}
        breadcrumbs={crumbs}
        breadcrumbsLabel={t("common.breadcrumbs")}
        meta={
          <>
            <HandoverStatusBadge status={h.status} />
            <Link href={`/sales/${h.sale_id}`} className="text-primary hover:underline">
              {t("handover.sale", { id: h.sale_id })}
            </Link>
            <span className="num">{formatDateTime(h.scheduled_at, locale)}</span>
          </>
        }
        actions={
          canManage && !closed ? (
            <>
              {h.status === "scheduled" && (
                <>
                  <Button variant="outline" onClick={() => setDialog("reschedule")}>
                    <CalendarClock data-icon="inline-start" />
                    {t("handover.reschedule")}
                  </Button>
                  <Button onClick={() => setDialog("inspect")}>
                    <ClipboardCheck data-icon="inline-start" />
                    {t("handover.inspect")}
                  </Button>
                </>
              )}
              <Button variant={canClose ? "default" : "outline"} disabled={!canClose} title={!canClose ? t("handover.closeBlocked") : undefined} onClick={() => setDialog("close")}>
                <Lock data-icon="inline-start" />
                {t("handover.close")}
              </Button>
            </>
          ) : null
        }
      />

      <Stepper status={h.status} />

      {h.status === "inspected" && (
        <p className="flex items-center gap-2 rounded-lg border border-info/25 bg-info/5 px-3 py-2 text-sm text-info">
          <Info aria-hidden className="size-4 shrink-0" />
          {t("handover.waitingOwner")}
        </p>
      )}
      {h.accepted_at && h.accepted_by_client_id && (
        <p className="text-sm text-success">{t("handover.acceptedBy", { id: h.accepted_by_client_id, date: formatDateTime(h.accepted_at, locale) })}</p>
      )}
      {canManage && !closed && !canClose && isAccepted(h) && <p className="text-xs text-muted-foreground">{t("handover.closeBlocked")}</p>}
      {h.notes && (
        <p className="rounded-lg border bg-card p-3 text-sm">
          <span className="font-medium">{t("handover.notes")}: </span>
          {h.notes}
        </p>
      )}

      <section className="grid gap-3">
        <h2 className="text-sm font-medium">{t("handover.snags")}</h2>
        {snags.length === 0 ? (
          <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">{t("handover.noSnags")}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("handover.columns.area")}</TableHead>
                  <TableHead>{t("handover.columns.description")}</TableHead>
                  <TableHead>{t("handover.columns.severity")}</TableHead>
                  <TableHead>{t("handover.columns.status")}</TableHead>
                  <TableHead>{t("handover.columns.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snags.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.area}</TableCell>
                    <TableCell className="whitespace-normal">{s.description}</TableCell>
                    <TableCell>
                      <SeverityBadge severity={s.severity} />
                    </TableCell>
                    <TableCell>
                      <SnagStatusBadge status={s.status} />
                    </TableCell>
                    <TableCell>
                      {canManage && s.status === "open" && !closed && (
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updateSnag.isPending}
                            onClick={() => updateSnag.mutate({ snagId: s.id, status: "fixed" }, { onSuccess: () => toast.success(t("handover.snagUpdated")) })}
                          >
                            {t("handover.markFixed")}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={updateSnag.isPending}
                            onClick={() => updateSnag.mutate({ snagId: s.id, status: "waived" }, { onSuccess: () => toast.success(t("handover.snagUpdated")) })}
                          >
                            {t("handover.waive")}
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {updateSnag.error && <FormError>{errorMessage(updateSnag.error)}</FormError>}
        {canManage && !closed && h.status !== "scheduled" && <AddSnagForm handoverId={h.id} />}
      </section>

      {dialog === "reschedule" && <RescheduleDialog handover={h} onClose={() => setDialog(null)} />}
      {dialog === "inspect" && <InspectDialog handover={h} onClose={() => setDialog(null)} />}
      <ConfirmDialog
        open={dialog === "close"}
        onOpenChange={(o) => {
          if (!o) {
            setDialog(null);
            close.reset();
          }
        }}
        title={t("handover.closeTitle", { id })}
        consequence={t("handover.closeBody")}
        confirmLabel={t("handover.close")}
        pending={close.isPending}
        error={close.error ? errorMessage(close.error) : undefined}
        onConfirm={() =>
          close.mutate(undefined, {
            onSuccess: () => {
              toast.success(t("handover.closed"));
              setDialog(null);
            },
          })
        }
      />
    </>
  );
}
