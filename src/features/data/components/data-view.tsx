"use client";

import { Download, ExternalLink, FileSpreadsheet, Loader2, ShieldCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { DataTable, type Column } from "@/components/shared/data-table/data-table";
import { paginationProps } from "@/components/shared/data-table/list-params";
import { FilterBar, FilterSelect, ResetFilters, SearchFilter } from "@/components/shared/filters";
import { EmptyState, FormError } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/features/auth/hooks";
import { useErrorMessage } from "@/hooks/use-error-message";
import { openSignedLink } from "@/lib/api/files";
import { formatDate } from "@/lib/format/dates";
import { DOCUMENT_SOURCES, EXPORTS, documentLink, type DocumentRow, type ExportKind } from "../api";
import { useDocuments, useDocumentsState, useExport } from "../hooks";

function formatSize(bytes: number, locale: string) {
  const [value, unit] = bytes >= 1_048_576 ? [bytes / 1_048_576, "megabyte"] : bytes >= 1024 ? [bytes / 1024, "kilobyte"] : [bytes, "byte"];
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA-u-nu-latn" : "en", { style: "unit", unit, unitDisplay: "short", maximumFractionDigits: 1 }).format(value);
}

function Exports() {
  const t = useTranslations("data");
  const errorMessage = useErrorMessage();
  const download = useExport();
  const [current, setCurrent] = useState<ExportKind | null>(null);
  return (
    <section className="grid gap-3" aria-labelledby="exports-title">
      <h2 id="exports-title" className="text-sm font-medium">
        {t("exportsTitle")}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {EXPORTS.map((what) => {
          const busy = download.isPending && current === what;
          return (
            <li key={what} className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3">
              <span className="flex items-center gap-2 text-sm font-medium">
                <FileSpreadsheet aria-hidden className="size-4 text-muted-foreground" />
                {t(`exports.${what}`)}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={download.isPending}
                onClick={() => {
                  setCurrent(what);
                  download.mutate(what);
                }}
              >
                {busy ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Download data-icon="inline-start" />}
                {busy ? t("downloading") : t("download")}
              </Button>
            </li>
          );
        })}
      </ul>
      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldCheck aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        {t("exportsNote")}
      </p>
      {download.error && <FormError>{errorMessage(download.error)}</FormError>}
    </section>
  );
}

function Documents() {
  const t = useTranslations();
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const { can } = usePermissions();
  const canOpenSale = can("sales.docs");
  const canOpenService = can(["service.view", "service.manage"]);
  const [state, setState] = useDocumentsState();
  const list = useDocuments(state, true);
  const [openError, setOpenError] = useState<string | null>(null);
  const set = (patch: Partial<typeof state>) => setState({ ...patch, page: 1 });

  const columns: Column<DocumentRow>[] = [
    { id: "source", header: t("data.columns.source"), cell: (d) => ((DOCUMENT_SOURCES as readonly string[]).includes(d.source) ? t(`data.sources.${d.source as (typeof DOCUMENT_SOURCES)[number]}`) : d.source) },
    { id: "record", header: t("data.columns.record"), cell: (d) => <span className="num">#{d.owner_id}</span> },
    { id: "type", header: t("data.columns.type"), cell: (d) => <span className="text-muted-foreground">{d.type}</span> },
    { id: "file", header: t("data.columns.file"), cell: (d) => <span dir="ltr" className="font-medium">{d.original_name}</span> },
    { id: "size", header: t("data.columns.size"), align: "end", cell: (d) => <span className="num">{formatSize(d.size, locale)}</span> },
    { id: "added", header: t("data.columns.added"), cell: (d) => <span className="num text-muted-foreground">{formatDate(d.created_at, locale)}</span> },
    {
      id: "open",
      header: t("data.columns.open"),
      cell: (d) => {
        const link = documentLink(d);
        const allowed = d.source === "sale" ? canOpenSale : canOpenService;
        if (!link || !allowed) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setOpenError(null);
              openSignedLink(link).catch((e) => setOpenError(errorMessage(e)));
            }}
          >
            <ExternalLink data-icon="inline-start" />
            {t("common.open")}
          </Button>
        );
      },
    },
  ];

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3" aria-labelledby="documents-title">
      <h2 id="documents-title" className="text-sm font-medium">
        {t("data.documentsTitle")}
      </h2>
      <FilterBar>
        <FilterSelect
          label={t("data.filters.source")}
          value={state.source}
          onChange={(v) => set({ source: v })}
          options={DOCUMENT_SOURCES.map((s) => ({ value: s, label: t(`data.sources.${s}`) }))}
        />
        <SearchFilter value={state.type} onChange={(v) => set({ type: v })} placeholder={t("data.filters.type")} className="sm:w-44" />
        <ResetFilters count={[state.source, state.type].filter(Boolean).length} onReset={() => setState({ source: null, type: null, page: 1 })} />
      </FilterBar>
      {openError && <FormError>{openError}</FormError>}
      <DataTable
        caption={t("data.documentsTitle")}
        columns={columns}
        rows={list.data?.items}
        getRowId={(d) => d.ref}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        error={list.error}
        onRetry={() => list.refetch()}
        pagination={paginationProps(list.data?.meta, setState)}
        empty={<EmptyState compact title={t("data.documentsEmpty")} />}
      />
    </section>
  );
}

// S36 — Exports and documents. Each half shows only with its own permission.
export function DataView() {
  const { can } = usePermissions();
  return (
    <>
      {can("reports.view") && <Exports />}
      {can(["sales.docs", "service.manage"]) && <Documents />}
    </>
  );
}
