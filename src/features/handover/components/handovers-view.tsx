"use client";

import { useLocale, useTranslations } from "next-intl";
import { DataTable, type Column } from "@/components/shared/data-table/data-table";
import { paginationProps } from "@/components/shared/data-table/list-params";
import { FilterBar, FilterSelect, ResetFilters, SearchFilter } from "@/components/shared/filters";
import { EmptyState } from "@/components/shared/states";
import { HANDOVER_STATUSES } from "@/config/statuses";
import { Link, useRouter } from "@/i18n/navigation";
import { formatDate, formatDateTime } from "@/lib/format/dates";
import type { Handover } from "../api";
import { useHandovers, useHandoversState } from "../hooks";
import { HandoverStatusBadge } from "./handover-badges";

// S20 — Handovers.
export function HandoversView() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [state, setState] = useHandoversState();
  const list = useHandovers(state);
  const set = (patch: Partial<typeof state>) => setState({ ...patch, page: 1 });

  const columns: Column<Handover>[] = [
    { id: "id", header: t("handovers.columns.id"), cell: (h) => <span className="num font-medium">{h.id}</span> },
    {
      id: "sale",
      header: t("handovers.columns.sale"),
      cell: (h) => (
        <Link href={`/sales/${h.sale_id}`} onClick={(e) => e.stopPropagation()} className="num text-primary hover:underline">
          {t("handover.sale", { id: h.sale_id })}
        </Link>
      ),
    },
    { id: "scheduled", header: t("handovers.columns.scheduled"), cell: (h) => <span className="num">{formatDateTime(h.scheduled_at, locale)}</span> },
    { id: "status", header: t("handovers.columns.status"), cell: (h) => <HandoverStatusBadge status={h.status} /> },
    { id: "accepted", header: t("handovers.columns.accepted"), cell: (h) => <span className="num text-muted-foreground">{formatDate(h.accepted_at, locale)}</span> },
  ];

  return (
    <>
      <FilterBar>
        <FilterSelect
          label={t("handovers.filters.status")}
          value={state.status}
          onChange={(v) => set({ status: v })}
          options={HANDOVER_STATUSES.map((s) => ({ value: s, label: t(`statuses.handover.${s}`) }))}
        />
        <SearchFilter value={state.sale} onChange={(v) => set({ sale: v })} placeholder={t("handovers.filters.sale")} inputMode="numeric" className="sm:w-40" />
        <ResetFilters count={[state.status, state.sale].filter(Boolean).length} onReset={() => setState({ status: null, sale: null, page: 1 })} />
      </FilterBar>
      <DataTable
        caption={t("handovers.title")}
        columns={columns}
        rows={list.data?.items}
        getRowId={(h) => h.id}
        getRowLabel={(h) => t("handover.title", { id: h.id })}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        error={list.error}
        onRetry={() => list.refetch()}
        onRowClick={(h) => router.push(`/handovers/${h.id}`)}
        pagination={paginationProps(list.data?.meta, setState)}
        empty={<EmptyState compact title={t("handovers.empty")} />}
      />
    </>
  );
}
