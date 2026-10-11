"use client";

import { useLocale, useTranslations } from "next-intl";
import { DataTable, type Column } from "@/components/shared/data-table/data-table";
import { paginationProps } from "@/components/shared/data-table/list-params";
import { FilterBar, FilterSelect, ResetFilters, SearchFilter } from "@/components/shared/filters";
import { EmptyState } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import { isSaleStatus, SALE_STATUSES } from "@/config/statuses";
import { useSalesSummary } from "@/features/dashboard/hooks";
import { Link, useRouter } from "@/i18n/navigation";
import { formatDate } from "@/lib/format/dates";
import { addMoney, formatCount, formatMoney } from "@/lib/format/money";
import { useSales, useSalesState } from "../hooks";
import type { Sale } from "../types";
import { SaleStatusBadge } from "./badges";

/** Totals from /reports/sales-summary (reports.view); hidden without the permission. */
function SalesTotals() {
  const t = useTranslations("sales.totals");
  const locale = useLocale();
  const summary = useSalesSummary();
  if (!summary.allowed || summary.error) return null;
  const rows = summary.data?.sales_by_status ?? [];
  const live = rows.filter((r) => r.status !== "cancelled");
  const items = [
    [t("count"), formatCount(live.reduce((n, r) => n + r.count, 0), locale)],
    [t("value"), formatMoney(addMoney(...live.map((r) => r.value)), locale)],
    [t("collected"), formatMoney(summary.data?.collected, locale)],
    [t("outstanding"), formatMoney(summary.data?.installments_outstanding, locale)],
  ] as const;
  return (
    <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-xl border bg-card p-3">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="num mt-1 text-lg font-semibold">{summary.isLoading ? <Skeleton className="h-6 w-24" /> : value}</dd>
        </div>
      ))}
    </dl>
  );
}

// S13 — Sales.
export function SalesView() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [state, setState] = useSalesState();
  const list = useSales(state);
  const set = (patch: Partial<typeof state>) => setState({ ...patch, page: 1 });

  const columns: Column<Sale>[] = [
    { id: "id", header: t("sales.columns.id"), cell: (s) => <span className="num font-medium">{s.id}</span> },
    {
      id: "unit",
      header: t("sales.columns.unit"),
      cell: (s) => (
        <Link href={`/units/${s.unit_id}`} onClick={(e) => e.stopPropagation()} className="num text-primary hover:underline">
          {t("common.unitRef", { id: s.unit_id })}
        </Link>
      ),
    },
    { id: "client", header: t("sales.columns.client"), cell: (s) => <span className="num">{t("common.clientRef", { id: s.client_id })}</span> },
    { id: "status", header: t("sales.columns.status"), cell: (s) => <SaleStatusBadge status={s.status} /> },
    { id: "price", header: t("sales.columns.price"), align: "end", cell: (s) => <span className="num">{formatMoney(s.price_agreed, locale)}</span> },
    {
      id: "next",
      header: t("sales.columns.next"),
      cell: (s) => <span className="text-xs text-muted-foreground">{isSaleStatus(s.status) ? t(`sales.next.${s.status}`) : "—"}</span>,
    },
    { id: "sold", header: t("sales.columns.sold"), cell: (s) => <span className="num text-muted-foreground">{formatDate(s.sold_at, locale)}</span> },
  ];

  return (
    <>
      <SalesTotals />
      <FilterBar>
        <FilterSelect
          label={t("sales.filters.status")}
          value={state.status}
          onChange={(v) => set({ status: v })}
          options={SALE_STATUSES.map((s) => ({ value: s, label: t(`statuses.sale.${s}`) }))}
        />
        <SearchFilter value={state.unit} onChange={(v) => set({ unit: v })} placeholder={t("sales.filters.unit")} inputMode="numeric" className="sm:w-44" />
        <SearchFilter value={state.client} onChange={(v) => set({ client: v })} placeholder={t("sales.filters.client")} inputMode="numeric" className="sm:w-44" />
        <ResetFilters
          count={[state.status, state.unit, state.client].filter(Boolean).length}
          onReset={() => setState({ status: null, unit: null, client: null, page: 1 })}
        />
      </FilterBar>
      <DataTable
        caption={t("sales.title")}
        columns={columns}
        rows={list.data?.items}
        getRowId={(s) => s.id}
        getRowLabel={(s) => t("sale.title", { id: s.id })}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        error={list.error}
        onRetry={() => list.refetch()}
        // The sale has its own full page (stepper, tabs); rows open it directly.
        onRowClick={(s) => router.push(`/sales/${s.id}`)}
        pagination={paginationProps(list.data?.meta, setState)}
        empty={<EmptyState compact title={t("sales.empty")} />}
      />
    </>
  );
}
