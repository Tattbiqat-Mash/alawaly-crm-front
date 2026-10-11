"use client";

import { CalendarClock, ExternalLink, Loader2, Paperclip, Plus, Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Field } from "@/components/shared/form/field";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, FormError } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { isServiceRequestStatus, isVisitStatus, serviceActionsFor, type ServiceAction } from "@/config/statuses";
import { usePermissions } from "@/features/auth/hooks";
import { useAllResources } from "@/features/maintenance/hooks";
import { WARRANTY_CATEGORIES } from "@/features/warranty/api";
import { useErrorMessage } from "@/hooks/use-error-message";
import { Link } from "@/i18n/navigation";
import { toApiError } from "@/lib/api/errors";
import { openSignedLink } from "@/lib/api/files";
import { formatDateTime, inputToApiTimestamp, todayIso } from "@/lib/format/dates";
import { isOn, localizedName } from "@/lib/format/localized";
import { formatMoney, fromMinor, toMinor } from "@/lib/format/money";
import { serviceApi, type ServiceRequestDetail, type Visit } from "../api";
import { useAddMaterial, useRescheduleVisit, useServiceAction, useServiceRequest, useVisitMaterials } from "../hooks";
import { PriorityBadge, ServiceStatusBadge, useServiceTypeLabel } from "./service-badges";

/** Actions that need input open a dialog; the rest run directly. */
const NEEDS_INPUT: readonly ServiceAction[] = ["reject", "reopen", "assign", "schedule", "complete"];

function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-2 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-end">{children}</dd>
    </div>
  );
}

function AssignDialog({ request, onClose, onDone }: { request: ServiceRequestDetail; onClose: () => void; onDone: () => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const act = useServiceAction(request.id);
  const technicians = useAllResources("technicians", ["maint.manage", "service.manage"]);
  const contractors = useAllResources("contractors", ["maint.manage", "service.manage"]);
  const teams = useAllResources("teams", ["maint.manage", "service.manage"]);
  const [kind, setKind] = useState<"technician" | "contractor">("technician");
  const [who, setWho] = useState("");
  const [team, setTeam] = useState("none");
  // Inactive people stay in history but cannot be assigned.
  const options = kind === "technician" ? (technicians.data ?? []).filter((x) => isOn(x.active)) : (contractors.data ?? []).filter((x) => isOn(x.active));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!who) return;
            const body = {
              ...(kind === "technician" ? { technician_id: Number(who) } : { contractor_id: Number(who) }),
              ...(team !== "none" ? { team_id: Number(team) } : {}),
            };
            act.mutate({ action: "assign", body }, { onSuccess: onDone });
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("serviceRequest.assignTitle", { id: request.id })}</DialogTitle>
          </DialogHeader>
          <Tabs
            value={kind}
            onValueChange={(v) => {
              setKind(v as "technician" | "contractor");
              setWho("");
            }}
          >
            <TabsList>
              <TabsTrigger value="technician">{t("serviceRequest.technician")}</TabsTrigger>
              <TabsTrigger value="contractor">{t("serviceRequest.contractor")}</TabsTrigger>
            </TabsList>
          </Tabs>
          <Field id="as-who" label={t("serviceRequest.assignTo")} required>
            <Select value={who} onValueChange={setWho}>
              <SelectTrigger id="as-who" className="w-full">
                <SelectValue placeholder={t("serviceRequest.chooseOne")} />
              </SelectTrigger>
              <SelectContent>
                {options.map((x) => (
                  <SelectItem key={x.id} value={String(x.id)}>
                    {x.name}
                    {x.specialty ? ` · ${x.specialty}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {kind === "technician" && (
            <Field id="as-team" label={t("serviceRequest.team")}>
              <Select value={team} onValueChange={setTeam}>
                <SelectTrigger id="as-team" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {(teams.data ?? []).filter((x) => isOn(x.active)).map((x) => (
                    <SelectItem key={x.id} value={String(x.id)}>
                      {localizedName(x, locale) || `#${x.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          {act.error && <FormError>{errorMessage(act.error)}</FormError>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={!who || act.isPending}>
              {act.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {t("serviceRequest.actions.assign")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Schedule (request) or reschedule (visit): both take one date-time. */
function WhenDialog({ title, initial, pending, error, onSubmit, onClose }: { title: string; initial?: string | null; pending: boolean; error: unknown; onSubmit: (at: string) => void; onClose: () => void }) {
  const t = useTranslations();
  const errorMessage = useErrorMessage();
  const [when, setWhen] = useState(initial ? initial.slice(0, 16).replace(" ", "T") : "");
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (when) onSubmit(inputToApiTimestamp(when));
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <Field id="when" label={t("serviceRequest.when")} required>
            <Input id="when" type="datetime-local" dir="ltr" min={`${todayIso()}T00:00`} value={when} onChange={(e) => setWhen(e.target.value)} required />
          </Field>
          {error ? <FormError>{errorMessage(error)}</FormError> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={!when || pending}>
              {pending && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CompleteDialog({ request, onClose, onDone }: { request: ServiceRequestDetail; onClose: () => void; onDone: () => void }) {
  const t = useTranslations();
  const errorMessage = useErrorMessage();
  const act = useServiceAction(request.id);
  const [notes, setNotes] = useState("");
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            act.mutate({ action: "complete", body: notes.trim() ? { notes: notes.trim() } : {} }, { onSuccess: onDone });
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("serviceRequest.completeTitle", { id: request.id })}</DialogTitle>
          </DialogHeader>
          <Field id="cm-notes" label={t("serviceRequest.workNotes")}>
            <Textarea id="cm-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          {act.error && <FormError>{errorMessage(act.error)}</FormError>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={act.isPending}>
              {act.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {t("serviceRequest.actions.complete")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Materials({ visit, canAdd }: { visit: Visit; canAdd: boolean }) {
  const t = useTranslations("serviceRequest.materials");
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const materials = useVisitMaterials(visit.id);
  const add = useAddMaterial(visit.id);
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [cost, setCost] = useState("");
  const valid = name.trim() && /^\d+(\.\d{1,2})?$/.test(qty) && /^\d+(\.\d{1,2})?$/.test(cost);

  return (
    <div className="mt-2 grid gap-2">
      {materials.isLoading ? (
        <Skeleton className="h-8 w-full" />
      ) : (materials.data ?? []).length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="divide-y rounded-lg border text-sm">
          {(materials.data ?? []).map((m) => (
            <li key={m.id} className="flex justify-between gap-2 px-3 py-1.5">
              <span>{m.name}</span>
              <span className="num text-muted-foreground">
                {m.quantity} × {formatMoney(m.unit_cost, locale)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {canAdd && (
        <form
          className="grid grid-cols-[1fr_70px_100px_auto] items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid) return;
            add.mutate(
              { name: name.trim(), quantity: fromMinor(toMinor(qty)!), unit_cost: fromMinor(toMinor(cost)!) },
              {
                onSuccess: () => {
                  toast.success(t("added"));
                  setName("");
                  setQty("1");
                  setCost("");
                },
              },
            );
          }}
        >
          <Input aria-label={t("name")} placeholder={t("name")} value={name} onChange={(e) => setName(e.target.value)} />
          <Input aria-label={t("quantity")} inputMode="decimal" dir="ltr" value={qty} onChange={(e) => setQty(e.target.value.replace(/[^\d.]/g, ""))} />
          <Input aria-label={t("unitCost")} placeholder={t("unitCost")} inputMode="decimal" dir="ltr" value={cost} onChange={(e) => setCost(e.target.value.replace(/[^\d.]/g, ""))} />
          <Button type="submit" size="icon" aria-label={t("add")} disabled={!valid || add.isPending}>
            {add.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
          </Button>
          {add.error && (
            <div className="col-span-4">
              <FormError>{errorMessage(add.error)}</FormError>
            </div>
          )}
        </form>
      )}
    </div>
  );
}

// S25 — Service request detail.
export function ServiceRequestDetailView({ id }: { id: number }) {
  const t = useTranslations();
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const typeLabel = useServiceTypeLabel();
  const { can } = usePermissions();
  const canManage = can("service.manage");
  const canField = can(["service.field", "service.manage"]);
  const query = useServiceRequest(id);
  const act = useServiceAction(id);
  const reschedule = useRescheduleVisit();
  const [dialog, setDialog] = useState<ServiceAction | null>(null);
  const [visitToMove, setVisitToMove] = useState<Visit | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);

  const crumbs = [{ label: t("nav.groups.afterSales") }, { label: t("nav.items.serviceDesk"), href: "/service-requests" }, { label: `#${id}` }];
  if (query.isLoading) return <Skeleton className="h-96 w-full" />;
  if (query.error || !query.data) {
    return (
      <>
        <PageHeader title={t("serviceRequest.title", { id })} breadcrumbs={crumbs} breadcrumbsLabel={t("common.breadcrumbs")} />
        <div className="rounded-xl border bg-card">
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        </div>
      </>
    );
  }

  const r = query.data;
  const actions = isServiceRequestStatus(r.status) ? serviceActionsFor[r.status] : [];
  const done = (action: ServiceAction) => () => {
    setDialog(null);
    toast.success(t("serviceRequest.done", { status: t(`serviceRequest.actions.${action}`) }));
  };
  const run = (action: ServiceAction) => {
    if (NEEDS_INPUT.includes(action)) return setDialog(action);
    act.mutate({ action }, { onSuccess: done(action) });
  };
  const actError = act.error && !dialog ? toApiError(act.error) : null;

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {t("serviceRequest.title", { id })}
            <span className="text-base font-normal text-muted-foreground" dir="auto">
              {r.title}
            </span>
          </span>
        }
        breadcrumbs={crumbs}
        breadcrumbsLabel={t("common.breadcrumbs")}
        meta={
          <>
            <ServiceStatusBadge status={r.status} />
            <PriorityBadge priority={r.priority} />
            <StatusBadge>{typeLabel(r.type)}</StatusBadge>
          </>
        }
        actions={
          canManage
            ? actions.map((action, i) => (
                <Button
                  key={action}
                  variant={action === "reject" ? "ghost" : i === 0 ? "default" : "outline"}
                  className={action === "reject" ? "text-destructive hover:bg-destructive/10 hover:text-destructive" : undefined}
                  disabled={act.isPending}
                  onClick={() => run(action)}
                >
                  {act.isPending && act.variables?.action === action && <Loader2 data-icon="inline-start" className="animate-spin" />}
                  {t(`serviceRequest.actions.${action}`)}
                </Button>
              ))
            : null
        }
      />
      {actError && (
        <FormError>{actError.code === "INVALID_TRANSITION" ? t("serviceRequest.invalidTransition") : errorMessage(actError)}</FormError>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="grid content-start gap-4">
          {r.description && (
            <Section title={t("serviceRequest.fields.description")}>
              <p className="text-sm whitespace-pre-line" dir="auto">
                {r.description}
              </p>
            </Section>
          )}
          <Section title={t("serviceRequest.sections.visits")}>
            {(r.visits ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("serviceRequest.noVisits")}</p>
            ) : (
              <ul className="grid gap-3">
                {(r.visits ?? []).map((v) => (
                  <li key={v.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm">
                        <CalendarClock aria-hidden className="size-4 text-muted-foreground" />
                        <span className="num">{formatDateTime(v.scheduled_at, locale)}</span>
                        {v.status && <StatusBadge>{isVisitStatus(v.status) ? t(`statuses.visit.${v.status}`) : v.status}</StatusBadge>}
                      </span>
                      {canField && v.status !== "done" && (
                        <Button size="sm" variant="ghost" onClick={() => setVisitToMove(v)}>
                          {t("serviceRequest.rescheduleVisit")}
                        </Button>
                      )}
                    </div>
                    <h3 className="mt-2 text-xs font-medium text-muted-foreground">{t("serviceRequest.sections.materials")}</h3>
                    <Materials visit={v} canAdd={canField && v.status !== "done"} />
                  </li>
                ))}
              </ul>
            )}
          </Section>
          <Section title={t("serviceRequest.sections.timeline")}>
            <ol className="relative grid gap-3 border-s ps-4">
              {(r.events ?? []).map((e) => (
                <li key={e.id} className="text-sm">
                  <span aria-hidden className="absolute -start-1.5 mt-1.5 size-3 rounded-full border-2 border-background bg-primary" />
                  <div className="flex flex-wrap items-center gap-2">
                    {e.to_status ? <ServiceStatusBadge status={e.to_status} /> : <span className="font-medium">{e.event}</span>}
                    <span className="text-xs text-muted-foreground">
                      {e.actor_type === "client" ? t("serviceRequest.byClient") : e.actor_id ? t("serviceRequest.byStaff", { id: e.actor_id }) : ""}
                    </span>
                    <span className="num text-xs text-muted-foreground">{formatDateTime(e.created_at, locale)}</span>
                  </div>
                  {e.note && (
                    <p className="mt-1 text-muted-foreground" dir="auto">
                      {e.note}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </Section>
        </div>

        <div className="grid content-start gap-4">
          <Section title={t("serviceRequest.sections.info")}>
            <dl>
              <Row label={t("serviceRequest.fields.unit")}>
                <Link href={`/units/${r.unit_id}`} className="text-primary hover:underline">
                  {t("common.unitRef", { id: r.unit_id })}
                </Link>
              </Row>
              <Row label={t("serviceRequest.fields.owner")}>{r.client_id ? t("common.clientRef", { id: r.client_id }) : "—"}</Row>
              <Row label={t("serviceRequest.fields.category")}>
                {(WARRANTY_CATEGORIES as readonly string[]).includes(r.category)
                  ? t(`units.eligibility.categories.${r.category as (typeof WARRANTY_CATEGORIES)[number]}`)
                  : r.category}
              </Row>
              <Row label={t("serviceRequest.fields.sla")}>
                <span className="num">{formatDateTime(r.sla_due_at, locale)}</span>
              </Row>
              <Row label={t("serviceRequest.fields.warranty")}>{r.warranty_id ? `#${r.warranty_id}` : "—"}</Row>
              {r.rating !== null && (
                <Row label={t("serviceRequest.fields.rating")}>
                  <span className="inline-flex items-center gap-1">
                    <Star aria-hidden className="size-3.5 fill-current text-sand" />
                    <span className="num">{r.rating}/5</span>
                  </span>
                </Row>
              )}
              {r.feedback && <Row label={t("serviceRequest.fields.feedback")}>{r.feedback}</Row>}
              {r.reject_reason && <Row label={t("serviceRequest.fields.rejectReason")}>{r.reject_reason}</Row>}
            </dl>
          </Section>
          <Section title={t("serviceRequest.sections.attachments")}>
            {openError && <FormError>{openError}</FormError>}
            {(r.attachments ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("serviceRequest.noAttachments")}</p>
            ) : (
              <ul className="grid gap-1.5">
                {(r.attachments ?? []).map((a) => (
                  <li key={a.id}>
                    {/* Private file: fresh signed link (10 minutes) on every click. */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        setOpenError(null);
                        openSignedLink(() => serviceApi.attachmentLink(a.id)).catch((e) => setOpenError(errorMessage(e)));
                      }}
                    >
                      <Paperclip data-icon="inline-start" />
                      <span className="truncate" dir="ltr">
                        {a.original_name}
                      </span>
                      <ExternalLink data-icon="inline-end" className="ms-auto" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>

      {dialog === "assign" && <AssignDialog request={r} onClose={() => setDialog(null)} onDone={done("assign")} />}
      {dialog === "complete" && <CompleteDialog request={r} onClose={() => setDialog(null)} onDone={done("complete")} />}
      {dialog === "schedule" && (
        <WhenDialog
          title={t("serviceRequest.scheduleTitle")}
          pending={act.isPending}
          error={act.error}
          onClose={() => setDialog(null)}
          onSubmit={(at) => act.mutate({ action: "schedule", body: { scheduled_at: at } }, { onSuccess: done("schedule") })}
        />
      )}
      {visitToMove && (
        <WhenDialog
          title={t("serviceRequest.rescheduleVisit")}
          initial={visitToMove.scheduled_at}
          pending={reschedule.isPending}
          error={reschedule.error}
          onClose={() => setVisitToMove(null)}
          onSubmit={(at) =>
            reschedule.mutate(
              { visitId: visitToMove.id, at },
              {
                onSuccess: () => {
                  toast.success(t("serviceRequest.visitRescheduled"));
                  setVisitToMove(null);
                },
              },
            )
          }
        />
      )}
      <ConfirmDialog
        open={dialog === "reject" || dialog === "reopen"}
        onOpenChange={(o) => {
          if (!o) {
            setDialog(null);
            act.reset();
          }
        }}
        title={dialog === "reopen" ? t("serviceRequest.reopenTitle", { id }) : t("serviceRequest.rejectTitle", { id })}
        consequence={dialog === "reopen" ? t("serviceRequest.reopenBody") : t("serviceRequest.rejectBody")}
        confirmLabel={dialog === "reopen" ? t("serviceRequest.actions.reopen") : t("serviceRequest.actions.reject")}
        destructive={dialog === "reject"}
        requireReason
        pending={act.isPending}
        error={act.error ? errorMessage(act.error) : undefined}
        onConfirm={(reason) => dialog && act.mutate({ action: dialog, body: { reason } }, { onSuccess: done(dialog) })}
      />
    </>
  );
}
