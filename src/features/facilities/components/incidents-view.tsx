"use client";

import { Loader2, Siren } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/shared/data-table/data-table";
import { paginationProps } from "@/components/shared/data-table/list-params";
import { FilterBar, FilterSelect, ResetFilters } from "@/components/shared/filters";
import { Field } from "@/components/shared/form/field";
import { FormSheet } from "@/components/shared/form/form-sheet";
import { EmptyState, FormError } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SeverityBadge } from "@/features/handover/components/handover-badges";
import { SEVERITIES, type Severity } from "@/features/handover/api";
import { useErrorMessage } from "@/hooks/use-error-message";
import { toApiError } from "@/lib/api/errors";
import { useIdempotencyKey } from "@/lib/api/idempotency";
import { formatDateTime } from "@/lib/format/dates";
import { localizedName } from "@/lib/format/localized";
import { INCIDENT_STATUSES, type Incident } from "../api";
import { useAllAssets, useAllFacilities, useIncidentAction, useIncidents, useIncidentsState, useReportIncident } from "../hooks";
import { IncidentStatusBadge } from "./facility-badges";

function ReportSheet({ onClose }: { onClose: () => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const facilities = useAllFacilities();
  const assets = useAllAssets();
  const report = useReportIncident();
  const idempotency = useIdempotencyKey();
  const [v, setV] = useState({ facility_id: "", asset_id: "none", title: "", description: "", severity: "minor" as Severity });
  const [submitted, setSubmitted] = useState(false);
  const required = t("validation.required");
  // Only assets of the chosen facility (the API refuses a mismatch with 422).
  const facilityAssets = (assets.data ?? []).filter((a) => String(a.facility_id) === v.facility_id && a.status !== "retired");

  return (
    <FormSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={t("incidents.report")}
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
        if (!v.facility_id || !v.title.trim()) return;
        report.mutate(
          {
            body: {
              facility_id: Number(v.facility_id),
              asset_id: v.asset_id === "none" ? null : Number(v.asset_id),
              title: v.title.trim(),
              description: v.description.trim() || null,
              severity: v.severity,
            },
            key: idempotency.key,
          },
          {
            onSuccess: () => {
              idempotency.renew();
              toast.success(t("incidents.reported"));
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
          <Button type="submit" disabled={report.isPending}>
            {report.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
            {t("incidents.report")}
          </Button>
        </>
      }
    >
      <fieldset disabled={report.isPending} className="grid gap-4">
        <Field id="in-facility" label={t("incidents.fields.facility")} required error={submitted && !v.facility_id ? required : undefined}>
          <Select value={v.facility_id} onValueChange={(facility_id) => setV({ ...v, facility_id, asset_id: "none" })}>
            <SelectTrigger id="in-facility" className="w-full">
              <SelectValue placeholder={t("incidents.fields.facility")} />
            </SelectTrigger>
            <SelectContent>
              {(facilities.data ?? []).map((f) => (
                <SelectItem key={f.id} value={String(f.id)}>
                  {localizedName(f, locale) || `#${f.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id="in-asset" label={t("incidents.fields.asset")}>
          <Select value={v.asset_id} onValueChange={(asset_id) => setV({ ...v, asset_id })} disabled={!v.facility_id}>
            <SelectTrigger id="in-asset" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              {facilityAssets.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id="in-title" label={t("incidents.fields.title")} required error={submitted && !v.title.trim() ? required : undefined}>
          <Input id="in-title" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />
        </Field>
        <Field id="in-severity" label={t("incidents.fields.severity")}>
          <Select value={v.severity} onValueChange={(severity) => setV({ ...v, severity: severity as Severity })}>
            <SelectTrigger id="in-severity" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEVERITIES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`statuses.severity.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id="in-description" label={t("incidents.fields.description")}>
          <Textarea id="in-description" rows={3} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
        </Field>
      </fieldset>
      {report.error && <FormError>{errorMessage(report.error)}</FormError>}
    </FormSheet>
  );
}

function ResolveDialog({ incident, onClose }: { incident: Incident; onClose: () => void }) {
  const t = useTranslations();
  const errorMessage = useErrorMessage();
  const act = useIncidentAction();
  const [resolution, setResolution] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const error = submitted && !resolution.trim() ? t("incidents.resolutionRequired") : undefined;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
            if (!resolution.trim()) return;
            act.mutate(
              { id: incident.id, action: "resolve", resolution: resolution.trim() },
              {
                onSuccess: () => {
                  toast.success(t("incidents.updated"));
                  onClose();
                },
              },
            );
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("incidents.resolveTitle", { id: incident.id })}</DialogTitle>
          </DialogHeader>
          <Field id="resolution" label={t("incidents.resolution")} required error={error}>
            <Textarea id="resolution" rows={3} value={resolution} onChange={(e) => setResolution(e.target.value)} aria-invalid={error ? true : undefined} />
          </Field>
          {act.error && <FormError>{errorMessage(act.error)}</FormError>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={act.isPending}>
              {act.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {t("incidents.resolve")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// S30 — Incidents.
export function IncidentsView() {
  const t = useTranslations();
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const [state, setState] = useIncidentsState();
  const list = useIncidents(state);
  const facilities = useAllFacilities();
  const assets = useAllAssets();
  const act = useIncidentAction();
  const [reporting, setReporting] = useState(false);
  const [resolving, setResolving] = useState<Incident | null>(null);
  const set = (patch: Partial<typeof state>) => setState({ ...patch, page: 1 });

  const where = useMemo(() => {
    const f = new Map((facilities.data ?? []).map((x) => [x.id, x]));
    const a = new Map((assets.data ?? []).map((x) => [x.id, x.name]));
    return (i: Incident) => [localizedName(f.get(i.facility_id), locale) || `#${i.facility_id}`, i.asset_id ? (a.get(i.asset_id) ?? `#${i.asset_id}`) : null].filter(Boolean).join(" · ");
  }, [facilities.data, assets.data, locale]);

  const quick = (i: Incident, action: "investigate" | "close") =>
    act.mutate({ id: i.id, action }, { onSuccess: () => toast.success(t("incidents.updated")) });

  const columns: Column<Incident>[] = [
    { id: "id", header: t("incidents.columns.id"), cell: (i) => <span className="num font-medium">{i.id}</span> },
    { id: "title", header: t("incidents.columns.title"), className: "max-w-64 truncate", cell: (i) => <span title={i.title}>{i.title}</span> },
    { id: "where", header: t("incidents.columns.where"), cell: where },
    { id: "severity", header: t("incidents.columns.severity"), cell: (i) => <SeverityBadge severity={i.severity} /> },
    { id: "status", header: t("incidents.columns.status"), cell: (i) => <IncidentStatusBadge status={i.status} /> },
    { id: "reported", header: t("incidents.columns.reported"), cell: (i) => <span className="num text-muted-foreground">{formatDateTime(i.created_at, locale)}</span> },
    {
      id: "actions",
      header: t("incidents.columns.actions"),
      cell: (i) => (
        <div className="flex gap-1.5">
          {i.status === "open" && (
            <Button size="sm" variant="outline" disabled={act.isPending} onClick={() => quick(i, "investigate")}>
              {t("incidents.investigate")}
            </Button>
          )}
          {(i.status === "open" || i.status === "investigating") && (
            <Button size="sm" onClick={() => setResolving(i)}>
              {t("incidents.resolve")}
            </Button>
          )}
          {i.status === "resolved" && (
            <Button size="sm" variant="outline" disabled={act.isPending} onClick={() => quick(i, "close")}>
              {t("incidents.close")}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FilterBar>
          <FilterSelect
            label={t("incidents.filters.status")}
            value={state.status}
            onChange={(v) => set({ status: v })}
            options={INCIDENT_STATUSES.map((s) => ({ value: s, label: t(`statuses.incident.${s}`) }))}
          />
          <FilterSelect
            label={t("incidents.filters.severity")}
            value={state.severity}
            onChange={(v) => set({ severity: v })}
            options={SEVERITIES.map((s) => ({ value: s, label: t(`statuses.severity.${s}`) }))}
          />
          <FilterSelect
            label={t("incidents.filters.facility")}
            value={state.facility}
            onChange={(v) => set({ facility: v })}
            options={(facilities.data ?? []).map((f) => ({ value: String(f.id), label: localizedName(f, locale) || `#${f.id}` }))}
          />
          <ResetFilters
            count={[state.status, state.severity, state.facility].filter(Boolean).length}
            onReset={() => setState({ status: null, severity: null, facility: null, page: 1 })}
          />
        </FilterBar>
        <Button onClick={() => setReporting(true)}>
          <Siren data-icon="inline-start" />
          {t("incidents.report")}
        </Button>
      </div>
      {act.error && !resolving && <FormError>{errorMessage(act.error)}</FormError>}
      <DataTable
        caption={t("incidents.title")}
        columns={columns}
        rows={list.data?.items}
        getRowId={(i) => i.id}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        error={list.error}
        onRetry={() => list.refetch()}
        pagination={paginationProps(list.data?.meta, setState)}
        empty={<EmptyState compact title={t("incidents.empty")} />}
      />
      {reporting && <ReportSheet onClose={() => setReporting(false)} />}
      {resolving && <ResolveDialog incident={resolving} onClose={() => setResolving(null)} />}
    </>
  );
}
