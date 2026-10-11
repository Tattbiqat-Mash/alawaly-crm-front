"use client";

import { Link2, Loader2, Plug, RotateCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/shared/data-table/data-table";
import { paginationProps } from "@/components/shared/data-table/list-params";
import { FilterBar, FilterSelect, ResetFilters, SearchFilter } from "@/components/shared/filters";
import { Field } from "@/components/shared/form/field";
import { FormSheet } from "@/components/shared/form/form-sheet";
import { EmptyState, ErrorState, FormError, StatePanel } from "@/components/shared/states";
import { StatusBadge, type Tone } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useErrorMessage } from "@/hooks/use-error-message";
import { toApiError } from "@/lib/api/errors";
import { useIdempotencyKey } from "@/lib/api/idempotency";
import { formatDateTime } from "@/lib/format/dates";
import { cn } from "@/lib/utils";
import { EVENT_STATUSES, REF_ENTITY_TYPES, type EventStatus, type ExternalRef, type IntegrationEvent, type IntegrationHealth } from "../api";
import { useExternalRefs, useIntegrationEvents, useIntegrationHealthReport, useIntegrationsState, useLinkExternalRef, useRetryEvent } from "../hooks";

const EVENT_TONE: Record<EventStatus, Tone> = { pending: "info", sent: "success", failed: "warning", dead: "danger" };
const isKnown = (s: string): s is EventStatus => (EVENT_STATUSES as readonly string[]).includes(s);

function EventStatusBadge({ status }: { status: string }) {
  const t = useTranslations("statuses.integrationEvent");
  return <StatusBadge tone={isKnown(status) ? EVENT_TONE[status] : "neutral"}>{isKnown(status) ? t(status) : status}</StatusBadge>;
}

function HealthStrip({ health }: { health: IntegrationHealth }) {
  const t = useTranslations("integrations");
  const locale = useLocale();
  const count = (s: EventStatus) => (s === "dead" ? Math.max(health.dead ?? 0, health.by_status.dead ?? 0) : (health.by_status[s] ?? 0));
  return (
    <section className="grid gap-3" aria-label={t("health")}>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {EVENT_STATUSES.map((s) => (
          <div key={s} className="rounded-xl border bg-card p-3">
            <dt className="text-xs text-muted-foreground">{t(`kpi.${s}`)}</dt>
            <dd className={cn("num mt-0.5 text-xl font-semibold", s === "dead" && count(s) > 0 && "text-destructive", s === "failed" && count(s) > 0 && "text-warning")}>
              {count(s)}
            </dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
        {health.oldest_pending && <span className="num">{t("oldestPending", { date: formatDateTime(health.oldest_pending, locale) })}</span>}
        {Object.entries(health.subscriptions ?? {}).map(([system, events]) => (
          <span key={system} className="flex flex-wrap items-center gap-1.5">
            <Plug aria-hidden className="size-3.5" />
            <span className="font-medium text-foreground">{system}</span>
            {events.map((e) => (
              <code key={e} className="rounded bg-muted px-1.5 py-0.5 font-mono" dir="ltr">
                {e}
              </code>
            ))}
          </span>
        ))}
      </div>
    </section>
  );
}

function LinkRefSheet({ systems, onClose }: { systems: string[]; onClose: () => void }) {
  const t = useTranslations();
  const errorMessage = useErrorMessage();
  const link = useLinkExternalRef();
  const idempotency = useIdempotencyKey();
  const [v, setV] = useState({ system: systems[0] ?? "", entityType: "client", entityId: "", externalId: "" });
  const [submitted, setSubmitted] = useState(false);
  const required = t("validation.required");
  const ok = v.system.trim() && v.entityType && v.entityId && v.externalId.trim();
  const conflict = link.error && toApiError(link.error).status === 409 && toApiError(link.error).code !== "IDEMPOTENCY_CONFLICT";

  return (
    <FormSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={t("integrations.linkTitle")}
      description={t("integrations.linkBody")}
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
        if (!ok) return;
        link.mutate(
          { body: { system: v.system.trim(), entity_type: v.entityType, entity_id: Number(v.entityId), external_id: v.externalId.trim() }, key: idempotency.key },
          {
            onSuccess: () => {
              idempotency.renew();
              toast.success(t("integrations.linked"));
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
          <Button type="submit" disabled={link.isPending}>
            {link.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
            {t("integrations.link")}
          </Button>
        </>
      }
    >
      <fieldset disabled={link.isPending} className="grid gap-4">
        <Field id="xr-system" label={t("integrations.fields.system")} required error={submitted && !v.system.trim() ? required : undefined}>
          {systems.length > 0 ? (
            <Select value={v.system} onValueChange={(system) => setV({ ...v, system })}>
              <SelectTrigger id="xr-system" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {systems.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input id="xr-system" dir="ltr" value={v.system} onChange={(e) => setV({ ...v, system: e.target.value })} />
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="xr-type" label={t("integrations.fields.entityType")} required>
            <Select value={v.entityType} onValueChange={(entityType) => setV({ ...v, entityType })}>
              <SelectTrigger id="xr-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REF_ENTITY_TYPES.map((x) => (
                  <SelectItem key={x} value={x}>
                    {t(`integrations.entityTypes.${x}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="xr-entity" label={t("integrations.fields.entityId")} required error={submitted && !v.entityId ? required : undefined}>
            <Input id="xr-entity" inputMode="numeric" dir="ltr" value={v.entityId} onChange={(e) => setV({ ...v, entityId: e.target.value.replace(/\D/g, "") })} />
          </Field>
        </div>
        <Field id="xr-external" label={t("integrations.fields.externalId")} required error={submitted && !v.externalId.trim() ? required : undefined}>
          <Input id="xr-external" dir="ltr" value={v.externalId} onChange={(e) => setV({ ...v, externalId: e.target.value })} />
        </Field>
      </fieldset>
      {link.error && <FormError>{conflict ? t("integrations.refConflict") : errorMessage(link.error)}</FormError>}
    </FormSheet>
  );
}

// S40 — Integrations: outbox health, events, external ids.
export function IntegrationsView() {
  const t = useTranslations();
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const [state, setState] = useIntegrationsState();
  const health = useIntegrationHealthReport();
  const events = useIntegrationEvents(state, state.tab === "events");
  const refs = useExternalRefs(state, state.tab === "refs");
  const retry = useRetryEvent();
  const [retrying, setRetrying] = useState<number | null>(null);
  const [linking, setLinking] = useState(false);
  const set = (patch: Partial<typeof state>) => setState({ ...patch, page: 1 });
  const systems = health.data?.systems_configured ?? [];
  const systemOptions = systems.map((s) => ({ value: s, label: s }));

  const eventColumns: Column<IntegrationEvent>[] = [
    { id: "id", header: t("integrations.columns.id"), cell: (e) => <span className="num">{e.id}</span> },
    { id: "system", header: t("integrations.columns.system"), cell: (e) => e.system },
    { id: "event", header: t("integrations.columns.event"), cell: (e) => <code className="font-mono text-xs" dir="ltr">{e.event}</code> },
    { id: "status", header: t("integrations.columns.status"), cell: (e) => <EventStatusBadge status={e.status} /> },
    { id: "attempts", header: t("integrations.columns.attempts"), align: "end", cell: (e) => <span className="num">{e.attempts}</span> },
    { id: "error", header: t("integrations.columns.lastError"), cell: (e) => <span className="text-xs text-muted-foreground" dir="ltr">{e.last_error ?? "—"}</span> },
    {
      id: "when",
      header: t("integrations.columns.when"),
      cell: (e) => <span className="num text-xs text-muted-foreground">{formatDateTime(e.status === "sent" ? e.sent_at : e.next_retry_at ?? e.created_at, locale)}</span>,
    },
    {
      id: "actions",
      header: t("integrations.columns.actions"),
      cell: (e) =>
        e.status === "failed" || e.status === "dead" ? (
          <Button
            size="sm"
            variant="outline"
            disabled={retry.isPending}
            onClick={() => {
              setRetrying(e.id);
              retry.mutate(e.id, { onSuccess: () => toast.success(t("integrations.retried", { id: e.id })) });
            }}
          >
            {retry.isPending && retrying === e.id ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <RotateCcw data-icon="inline-start" />}
            {t("integrations.retry")}
          </Button>
        ) : null,
    },
  ];

  const refColumns: Column<ExternalRef>[] = [
    { id: "system", header: t("integrations.columns.system"), cell: (r) => r.system },
    { id: "entity", header: t("integrations.columns.entity"), cell: (r) => <span className="num"><span className="text-muted-foreground">{r.entity_type}</span> #{r.entity_id}</span> },
    { id: "external", header: t("integrations.columns.externalId"), cell: (r) => <code className="font-mono text-xs" dir="ltr">{r.external_id}</code> },
    { id: "created", header: t("integrations.columns.linkedAt"), cell: (r) => <span className="num text-xs text-muted-foreground">{formatDateTime(r.created_at, locale)}</span> },
  ];

  return (
    <>
      {health.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : health.error ? (
        <ErrorState compact error={health.error} onRetry={() => health.refetch()} />
      ) : health.data && systems.length === 0 ? (
        <StatePanel compact icon={Plug} tone="warning" title={t("integrations.noneConfigured")} description={t("integrations.noneConfiguredBody")} />
      ) : (
        health.data && <HealthStrip health={health.data} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs value={state.tab} onValueChange={(tab) => setState({ tab: tab as "events" | "refs", page: 1, status: null, entityType: null, entityId: null })}>
          <TabsList>
            <TabsTrigger value="events">{t("integrations.tabs.events")}</TabsTrigger>
            <TabsTrigger value="refs">{t("integrations.tabs.refs")}</TabsTrigger>
          </TabsList>
        </Tabs>
        {state.tab === "refs" && (
          <Button onClick={() => setLinking(true)}>
            <Link2 data-icon="inline-start" />
            {t("integrations.link")}
          </Button>
        )}
      </div>

      {state.tab === "events" ? (
        <>
          <FilterBar>
            <FilterSelect
              label={t("integrations.filters.status")}
              value={state.status}
              onChange={(v) => set({ status: v })}
              options={EVENT_STATUSES.map((s) => ({ value: s, label: t(`statuses.integrationEvent.${s}`) }))}
            />
            {systemOptions.length > 1 && <FilterSelect label={t("integrations.filters.system")} value={state.system} onChange={(v) => set({ system: v })} options={systemOptions} />}
            <ResetFilters count={[state.status, state.system].filter(Boolean).length} onReset={() => setState({ status: null, system: null, page: 1 })} />
          </FilterBar>
          {retry.error && <FormError>{errorMessage(retry.error)}</FormError>}
          <DataTable
            caption={t("integrations.tabs.events")}
            columns={eventColumns}
            rows={events.data?.items}
            getRowId={(e) => e.id}
            isLoading={events.isLoading}
            isFetching={events.isFetching}
            error={events.error}
            onRetry={() => events.refetch()}
            pagination={paginationProps(events.data?.meta, setState)}
            empty={<EmptyState compact title={t("integrations.eventsEmpty")} />}
          />
        </>
      ) : (
        <>
          <FilterBar>
            {systemOptions.length > 1 && <FilterSelect label={t("integrations.filters.system")} value={state.system} onChange={(v) => set({ system: v })} options={systemOptions} />}
            <FilterSelect
              label={t("integrations.filters.entityType")}
              value={state.entityType}
              onChange={(v) => set({ entityType: v })}
              options={REF_ENTITY_TYPES.map((x) => ({ value: x, label: t(`integrations.entityTypes.${x}`) }))}
            />
            <SearchFilter value={state.entityId} onChange={(v) => set({ entityId: v })} placeholder={t("integrations.filters.entityId")} inputMode="numeric" className="sm:w-36" />
            <ResetFilters
              count={[state.system, state.entityType, state.entityId].filter(Boolean).length}
              onReset={() => setState({ system: null, entityType: null, entityId: null, page: 1 })}
            />
          </FilterBar>
          <DataTable
            caption={t("integrations.tabs.refs")}
            columns={refColumns}
            rows={refs.data?.items}
            getRowId={(r) => r.id}
            isLoading={refs.isLoading}
            isFetching={refs.isFetching}
            error={refs.error}
            onRetry={() => refs.refetch()}
            pagination={paginationProps(refs.data?.meta, setState)}
            empty={<EmptyState compact title={t("integrations.refsEmpty")} />}
          />
        </>
      )}
      {linking && <LinkRefSheet systems={systems} onClose={() => setLinking(false)} />}
    </>
  );
}
