"use client";

import { ArrowLeftRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { DataTable, type Column } from "@/components/shared/data-table/data-table";
import { paginationProps } from "@/components/shared/data-table/list-params";
import { FilterBar, FilterSelect, ResetFilters, SearchFilter } from "@/components/shared/filters";
import { EmptyState } from "@/components/shared/states";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useEndSide } from "@/hooks/use-end-side";
import { Link } from "@/i18n/navigation";
import { formatDateTime } from "@/lib/format/dates";
import { AUDIT_ENTITY_TYPES, parseAuditJson, type AuditEntry } from "../api";
import { useAuditLog, useAuditState } from "../hooks";

/** Records that have a screen of their own. */
const ENTITY_ROUTES: Record<string, (id: string) => string> = {
  unit: (id) => `/units/${id}`,
  sale: (id) => `/sales/${id}`,
  handover: (id) => `/handovers/${id}`,
  service_request: (id) => `/service-requests/${id}`,
};

function EntityRef({ entry }: { entry: AuditEntry }) {
  const route = ENTITY_ROUTES[entry.entity_type];
  const label = (
    <>
      <span className="text-muted-foreground">{entry.entity_type}</span> <span className="num">#{entry.entity_id}</span>
    </>
  );
  return route ? (
    <Link href={route(String(entry.entity_id))} className="underline-offset-4 hover:underline" onClick={(e) => e.stopPropagation()}>
      {label}
    </Link>
  ) : (
    <span>{label}</span>
  );
}

/** One-line before → after summary of the changed keys. */
function changeSummary(entry: AuditEntry) {
  const before = parseAuditJson(entry.before);
  const after = parseAuditJson(entry.after);
  if (typeof before === "string" || typeof after === "string") return `${before ?? "—"} → ${after ?? "—"}`;
  const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])];
  const show = (v: unknown) => (v === undefined || v === null ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v));
  return keys
    .slice(0, 2)
    .map((k) => `${k}: ${show(before?.[k])} → ${show(after?.[k])}`)
    .join(" · ");
}

function JsonPanel({ title, value }: { title: string; value: string | null }) {
  const parsed = parseAuditJson(value);
  return (
    <details open className="rounded-lg border bg-muted/30">
      <summary className="cursor-pointer px-3 py-2 text-sm font-medium">{title}</summary>
      <pre dir="ltr" className="overflow-x-auto border-t px-3 py-2 text-xs">
        {parsed === null ? "—" : typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2)}
      </pre>
    </details>
  );
}

function AuditSheet({ entry, onClose }: { entry: AuditEntry; onClose: () => void }) {
  const t = useTranslations("audit");
  const locale = useLocale();
  const side = useEndSide();
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side={side} className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b">
          <SheetTitle className="font-mono text-base" dir="ltr">
            {entry.action}
          </SheetTitle>
          <SheetDescription className="num">{formatDateTime(entry.created_at, locale)}</SheetDescription>
        </SheetHeader>
        <div className="grid min-h-0 flex-1 content-start gap-4 overflow-y-auto p-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">{t("columns.actor")}</dt>
            <dd className="num">
              {entry.actor_type} #{entry.actor_id ?? "—"}
            </dd>
            <dt className="text-muted-foreground">{t("columns.entity")}</dt>
            <dd>
              <EntityRef entry={entry} />
            </dd>
            <dt className="text-muted-foreground">{t("source")}</dt>
            <dd>{entry.source ?? "—"}</dd>
            {entry.correlation_id && (
              <>
                <dt className="text-muted-foreground">{t("correlation")}</dt>
                <dd className="font-mono text-xs" dir="ltr">
                  {entry.correlation_id}
                </dd>
              </>
            )}
          </dl>
          <JsonPanel title={t("before")} value={entry.before} />
          <JsonPanel title={t("after")} value={entry.after} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

// S39 — Audit log (newest first; never shows request bodies or contact details).
export function AuditView() {
  const t = useTranslations();
  const locale = useLocale();
  const [state, setState] = useAuditState();
  const list = useAuditLog(state);
  const set = (patch: Partial<typeof state>) => setState({ ...patch, page: 1 });
  const opened = list.data?.items.find((e) => e.id === state.open);

  const columns: Column<AuditEntry>[] = [
    { id: "when", header: t("audit.columns.when"), cell: (e) => <span className="num whitespace-nowrap text-xs">{formatDateTime(e.created_at, locale)}</span> },
    {
      id: "actor",
      header: t("audit.columns.actor"),
      cell: (e) => (
        <span className="num">
          <span className="text-muted-foreground">{e.actor_type}</span> {e.actor_id ?? "—"}
        </span>
      ),
    },
    { id: "action", header: t("audit.columns.action"), cell: (e) => <code className="font-mono text-xs" dir="ltr">{e.action}</code> },
    { id: "entity", header: t("audit.columns.entity"), cell: (e) => <EntityRef entry={e} /> },
    {
      id: "change",
      header: t("audit.columns.change"),
      cell: (e) => (
        <span className="flex max-w-md items-center gap-1.5 truncate text-xs text-muted-foreground" dir="ltr">
          <ArrowLeftRight aria-hidden className="size-3 shrink-0" />
          <span className="truncate">{changeSummary(e)}</span>
        </span>
      ),
    },
  ];

  return (
    <>
      <FilterBar>
        <FilterSelect
          label={t("audit.filters.entityType")}
          value={state.entityType}
          onChange={(v) => set({ entityType: v })}
          options={AUDIT_ENTITY_TYPES.map((x) => ({ value: x, label: x }))}
        />
        <SearchFilter value={state.entityId} onChange={(v) => set({ entityId: v })} placeholder={t("audit.filters.entityId")} inputMode="numeric" className="sm:w-36" />
        <SearchFilter value={state.action} onChange={(v) => set({ action: v })} placeholder={t("audit.filters.action")} className="sm:w-44" />
        <SearchFilter value={state.actor} onChange={(v) => set({ actor: v })} placeholder={t("audit.filters.actor")} inputMode="numeric" className="sm:w-36" />
        <ResetFilters
          count={[state.entityType, state.entityId, state.action, state.actor].filter(Boolean).length}
          onReset={() => setState({ entityType: null, entityId: null, action: null, actor: null, page: 1 })}
        />
      </FilterBar>
      <DataTable
        caption={t("audit.title")}
        columns={columns}
        rows={list.data?.items}
        getRowId={(e) => e.id}
        getRowLabel={(e) => `${e.action} ${e.entity_type} ${e.entity_id}`}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        error={list.error}
        onRetry={() => list.refetch()}
        onRowClick={(e) => setState({ open: e.id })}
        pagination={paginationProps(list.data?.meta, setState)}
        empty={<EmptyState compact title={t("audit.empty")} description={t("audit.emptyHint")} />}
      />
      {opened && <AuditSheet key={opened.id} entry={opened} onClose={() => setState({ open: null })} />}
    </>
  );
}
