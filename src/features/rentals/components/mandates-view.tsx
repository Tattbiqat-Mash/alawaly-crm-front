"use client";

import { CircleCheck, Loader2, Plus, Upload, Wrench } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type Column } from "@/components/shared/data-table/data-table";
import { paginationProps } from "@/components/shared/data-table/list-params";
import { FileDrop } from "@/components/shared/file-drop";
import { FilterBar, FilterSelect, ResetFilters, SearchFilter } from "@/components/shared/filters";
import { Field } from "@/components/shared/form/field";
import { FormSheet } from "@/components/shared/form/form-sheet";
import { EmptyState, FormError } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { usePermissions } from "@/features/auth/hooks";
import { WARRANTY_CATEGORIES } from "@/features/warranty/api";
import { useEndSide } from "@/hooks/use-end-side";
import { useErrorMessage } from "@/hooks/use-error-message";
import { Link } from "@/i18n/navigation";
import { toApiError } from "@/lib/api/errors";
import { useIdempotencyKey } from "@/lib/api/idempotency";
import { formatDate, todayIso } from "@/lib/format/dates";
import { cn } from "@/lib/utils";
import { MANDATE_MODES, MANDATE_STATUSES, type Mandate } from "../api";
import { useCreateMandate, useMandateAction, useMandates, useMandatesState, useRaiseMandateRequest, useUploadMandateDocument } from "../hooks";
import { CapabilityChips, MandateStatusBadge, useRentalLabels } from "./rental-shared";

const ACCEPT = ["application/pdf", "image/jpeg", "image/png"];

function CreateMandateSheet({ onClose, onCreated }: { onClose: () => void; onCreated: (m: Mandate) => void }) {
  const t = useTranslations();
  const labels = useRentalLabels();
  const errorMessage = useErrorMessage();
  const create = useCreateMandate();
  const idempotency = useIdempotencyKey();
  const [v, setV] = useState({ unit: "", owner: "", mode: "full_management", from: todayIso(), to: "" });
  const [submitted, setSubmitted] = useState(false);
  const required = t("validation.required");
  return (
    <FormSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={t("mandates.new")}
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
        if (!/^\d+$/.test(v.unit) || !/^\d+$/.test(v.owner) || !v.from) return;
        create.mutate(
          { body: { unit_id: Number(v.unit), owner_client_id: Number(v.owner), mode: v.mode, valid_from: v.from, valid_to: v.to || null }, key: idempotency.key },
          {
            onSuccess: (m) => {
              idempotency.renew();
              toast.success(t("mandates.created"));
              onCreated(m);
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
        <Field id="md-unit" label={t("mandates.fields.unit")} required error={submitted && !/^\d+$/.test(v.unit) ? required : undefined}>
          <Input id="md-unit" inputMode="numeric" dir="ltr" value={v.unit} onChange={(e) => setV({ ...v, unit: e.target.value.replace(/\D/g, "") })} />
        </Field>
        <Field id="md-owner" label={t("mandates.fields.owner")} required description={t("mandates.fields.ownerHint")} error={submitted && !/^\d+$/.test(v.owner) ? required : undefined}>
          <Input id="md-owner" inputMode="numeric" dir="ltr" value={v.owner} onChange={(e) => setV({ ...v, owner: e.target.value.replace(/\D/g, "") })} />
        </Field>
        <Field id="md-mode" label={t("mandates.fields.mode")}>
          <Select value={v.mode} onValueChange={(mode) => setV({ ...v, mode })}>
            <SelectTrigger id="md-mode" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MANDATE_MODES.map((m) => (
                <SelectItem key={m} value={m}>
                  {labels.mode(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="md-from" label={t("mandates.fields.validFrom")} required>
            <Input id="md-from" type="date" dir="ltr" value={v.from} onChange={(e) => setV({ ...v, from: e.target.value })} />
          </Field>
          <Field id="md-to" label={t("mandates.fields.validTo")}>
            <Input id="md-to" type="date" dir="ltr" min={v.from} value={v.to} onChange={(e) => setV({ ...v, to: e.target.value })} />
          </Field>
        </div>
      </fieldset>
      {create.error && <FormError>{errorMessage(create.error)}</FormError>}
    </FormSheet>
  );
}

function Step({ done, children }: { done: boolean; children: ReactNode }) {
  return (
    <li className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm", done ? "border-success/30 bg-success/5 text-success" : "text-muted-foreground")}>
      {done && <CircleCheck aria-hidden className="size-4" />}
      {children}
    </li>
  );
}

function MandateSheet({ mandate, onClose }: { mandate: Mandate; onClose: () => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const side = useEndSide();
  const labels = useRentalLabels();
  const errorMessage = useErrorMessage();
  const { can } = usePermissions();
  const canManage = can("rental.manage");
  const upload = useUploadMandateDocument();
  const action = useMandateAction();
  const raise = useRaiseMandateRequest();
  const requestKey = useIdempotencyKey();
  const [current, setCurrent] = useState(mandate);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | undefined>(undefined);
  const [confirm, setConfirm] = useState<"end" | "revoke" | null>(null);
  const [request, setRequest] = useState({ category: "other", title: "" });
  const m = current;

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side={side} className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b">
          <SheetTitle>{t("mandates.detailTitle", { id: m.id })}</SheetTitle>
          <SheetDescription asChild>
            <div className="flex flex-wrap items-center gap-2">
              <MandateStatusBadge status={m.status} />
              <span>{labels.mode(m.mode)}</span>
            </div>
          </SheetDescription>
        </SheetHeader>
        <div className="grid min-h-0 flex-1 content-start gap-4 overflow-y-auto p-4">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">{t("mandates.columns.unit")}</dt>
              <dd>
                <Link href={`/units/${m.unit_id}`} className="text-primary hover:underline">
                  {t("common.unitRef", { id: m.unit_id })}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("mandates.columns.owner")}</dt>
              <dd>{t("common.clientRef", { id: m.owner_client_id })}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-muted-foreground">{t("mandates.columns.valid")}</dt>
              <dd className="num">
                {t("mandates.validRange", { from: formatDate(m.valid_from, locale), to: m.valid_to ? formatDate(m.valid_to, locale) : t("mandates.openEnded") })}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="mb-1 text-xs text-muted-foreground">{t("mandates.columns.capabilities")}</dt>
              <dd>
                <CapabilityChips capabilities={m.capabilities} />
              </dd>
            </div>
          </dl>

          <ol className="grid gap-2">
            <Step done>{t("mandates.steps.create")}</Step>
            <Step done={m.has_document}>{t("mandates.steps.document")}</Step>
            <Step done={m.status !== "draft"}>{t("mandates.steps.activate")}</Step>
          </ol>

          {canManage && m.status === "draft" && (
            <section className="grid gap-3 rounded-xl border p-3">
              <FileDrop
                accept={ACCEPT}
                maxBytes={10 * 1024 * 1024}
                value={file}
                onChange={setFile}
                progress={progress}
                disabled={upload.isPending}
                labels={{
                  prompt: t("sale.documents.drop.prompt"),
                  hint: t("sale.documents.drop.hint"),
                  remove: t("sale.documents.drop.remove"),
                  tooLarge: t("sale.documents.drop.tooLarge"),
                  wrongType: t("sale.documents.drop.wrongType"),
                }}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={!file || upload.isPending}
                  onClick={() => {
                    if (!file) return;
                    setProgress(0);
                    upload.mutate(
                      { id: m.id, file, onProgress: setProgress },
                      {
                        onSuccess: (next) => {
                          setCurrent({ ...next, capabilities: m.capabilities });
                          setFile(null);
                          toast.success(t("mandates.uploaded"));
                        },
                        onSettled: () => setProgress(undefined),
                      },
                    );
                  }}
                >
                  {upload.isPending ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Upload data-icon="inline-start" />}
                  {t("mandates.upload")}
                </Button>
                <Button
                  disabled={action.isPending}
                  onClick={() =>
                    action.mutate(
                      { id: m.id, action: "activate" },
                      {
                        onSuccess: (next) => {
                          setCurrent(next);
                          toast.success(t("mandates.activated"));
                        },
                      },
                    )
                  }
                >
                  {action.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
                  {t("mandates.activate")}
                </Button>
              </div>
              {(upload.error || (action.error && !confirm)) && <FormError>{errorMessage(upload.error ?? action.error)}</FormError>}
            </section>
          )}

          {canManage && m.status === "active" && (
            <>
              <form
                className="grid gap-3 rounded-xl border p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!request.title.trim()) return;
                  raise.mutate(
                    { id: m.id, body: { category: request.category, title: request.title.trim() }, key: requestKey.key },
                    {
                      onSuccess: (sr) => {
                        requestKey.renew();
                        setRequest({ category: "other", title: "" });
                        toast.success(t("mandates.requestCreated", { id: sr.id }));
                      },
                    },
                  );
                }}
              >
                <h3 className="text-sm font-medium">{t("mandates.requestTitle")}</h3>
                <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                  <Field id="mr-cat" label={t("mandates.requestCategory")}>
                    <Select value={request.category} onValueChange={(category) => setRequest({ ...request, category })}>
                      <SelectTrigger id="mr-cat" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WARRANTY_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {t(`units.eligibility.categories.${c}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field id="mr-title" label={t("mandates.requestTitleField")} required>
                    <Input id="mr-title" value={request.title} onChange={(e) => setRequest({ ...request, title: e.target.value })} />
                  </Field>
                </div>
                {raise.error && <FormError>{errorMessage(raise.error)}</FormError>}
                <Button type="submit" variant="outline" className="justify-self-start" disabled={!request.title.trim() || raise.isPending}>
                  {raise.isPending ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Wrench data-icon="inline-start" />}
                  {t("mandates.raiseRequest")}
                </Button>
              </form>
              <div className="flex flex-wrap gap-2 border-t pt-3">
                <Button variant="outline" onClick={() => setConfirm("end")}>
                  {t("mandates.end")}
                </Button>
                <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setConfirm("revoke")}>
                  {t("mandates.revoke")}
                </Button>
              </div>
            </>
          )}
        </div>
        <ConfirmDialog
          open={confirm !== null}
          onOpenChange={(o) => {
            if (!o) {
              setConfirm(null);
              action.reset();
            }
          }}
          title={confirm === "revoke" ? t("mandates.revokeTitle", { id: m.id }) : t("mandates.endTitle", { id: m.id })}
          consequence={confirm === "revoke" ? t("mandates.revokeBody") : t("mandates.endBody")}
          confirmLabel={confirm === "revoke" ? t("mandates.revoke") : t("mandates.end")}
          destructive
          pending={action.isPending}
          error={action.error ? errorMessage(action.error) : undefined}
          onConfirm={() =>
            confirm &&
            action.mutate(
              { id: m.id, action: confirm },
              {
                onSuccess: (next) => {
                  setCurrent(next);
                  toast.success(confirm === "revoke" ? t("mandates.revoked") : t("mandates.ended"));
                  setConfirm(null);
                },
              },
            )
          }
        />
      </SheetContent>
    </Sheet>
  );
}

// S31 — Rental mandates.
export function MandatesView() {
  const t = useTranslations();
  const locale = useLocale();
  const labels = useRentalLabels();
  const { can } = usePermissions();
  const [state, setState] = useMandatesState();
  const list = useMandates(state);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Mandate | null>(null);
  const set = (patch: Partial<typeof state>) => setState({ ...patch, page: 1 });

  const columns: Column<Mandate>[] = [
    { id: "id", header: t("mandates.columns.id"), cell: (m) => <span className="num font-medium">{m.id}</span> },
    { id: "unit", header: t("mandates.columns.unit"), cell: (m) => <span className="num">{t("common.unitRef", { id: m.unit_id })}</span> },
    { id: "owner", header: t("mandates.columns.owner"), cell: (m) => <span className="num">{t("common.clientRef", { id: m.owner_client_id })}</span> },
    { id: "mode", header: t("mandates.columns.mode"), cell: (m) => labels.mode(m.mode) },
    {
      id: "valid",
      header: t("mandates.columns.valid"),
      cell: (m) => (
        <span className="num text-xs">
          {t("mandates.validRange", { from: formatDate(m.valid_from, locale), to: m.valid_to ? formatDate(m.valid_to, locale) : t("mandates.openEnded") })}
        </span>
      ),
    },
    { id: "status", header: t("mandates.columns.status"), cell: (m) => <MandateStatusBadge status={m.status} /> },
    { id: "caps", header: t("mandates.columns.capabilities"), cell: (m) => <CapabilityChips capabilities={m.capabilities} /> },
    {
      id: "doc",
      header: t("mandates.columns.document"),
      cell: (m) => (m.has_document ? <StatusBadge tone="success">{t("mandates.hasDocument")}</StatusBadge> : <StatusBadge>{t("mandates.noDocument")}</StatusBadge>),
    },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FilterBar>
          <FilterSelect
            label={t("mandates.filters.status")}
            value={state.status}
            onChange={(v) => set({ status: v })}
            options={MANDATE_STATUSES.map((s) => ({ value: s, label: t(`statuses.mandate.${s}`) }))}
          />
          <FilterSelect label={t("mandates.filters.mode")} value={state.mode} onChange={(v) => set({ mode: v })} options={MANDATE_MODES.map((m) => ({ value: m, label: labels.mode(m) }))} />
          <SearchFilter value={state.unit} onChange={(v) => set({ unit: v })} placeholder={t("mandates.filters.unit")} inputMode="numeric" className="sm:w-44" />
          <ResetFilters count={[state.status, state.mode, state.unit].filter(Boolean).length} onReset={() => setState({ status: null, mode: null, unit: null, page: 1 })} />
        </FilterBar>
        {can("rental.manage") && (
          <Button onClick={() => setCreating(true)}>
            <Plus data-icon="inline-start" />
            {t("mandates.new")}
          </Button>
        )}
      </div>
      <DataTable
        caption={t("mandates.title")}
        columns={columns}
        rows={list.data?.items}
        getRowId={(m) => m.id}
        getRowLabel={(m) => t("mandates.detailTitle", { id: m.id })}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        error={list.error}
        onRetry={() => list.refetch()}
        onRowClick={setSelected}
        pagination={paginationProps(list.data?.meta, setState)}
        empty={<EmptyState compact title={t("mandates.empty")} />}
      />
      {creating && (
        <CreateMandateSheet
          onClose={() => setCreating(false)}
          onCreated={(m) => {
            setCreating(false);
            setSelected(m);
          }}
        />
      )}
      {selected && <MandateSheet key={selected.id} mandate={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
