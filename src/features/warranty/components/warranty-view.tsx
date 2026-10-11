"use client";

import { Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/shared/data-table/data-table";
import { paginationProps } from "@/components/shared/data-table/list-params";
import { FilterBar, ResetFilters, SearchFilter } from "@/components/shared/filters";
import { EmptyState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActiveBadge } from "@/features/catalog/components/active-badge";
import type { Warranty, WarrantyPolicy } from "@/features/sales/types";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/format/dates";
import { isOn, localizedField } from "@/lib/format/localized";
import { WARRANTY_CATEGORIES } from "../api";
import { useAllPolicies, usePolicies, useWarranties, useWarrantyState } from "../hooks";
import { PolicyFormSheet } from "./policy-form-sheet";

type Category = (typeof WARRANTY_CATEGORIES)[number];

// S23 — Warranty policies and applied warranties (warranty.manage).
export function WarrantyView() {
  const t = useTranslations();
  const locale = useLocale();
  const [state, setState] = useWarrantyState();
  const policies = usePolicies(state, state.tab === "policies");
  const warranties = useWarranties(state, state.tab === "warranties");
  const allPolicies = useAllPolicies();
  const [sheet, setSheet] = useState<null | "new" | WarrantyPolicy>(null);
  const set = (patch: Partial<typeof state>) => setState({ ...patch, page: 1 });

  const categoryLabel = (c: string) => (WARRANTY_CATEGORIES.includes(c as Category) ? t(`units.eligibility.categories.${c as Category}`) : c);
  const transferLabel = (v: WarrantyPolicy["transferable"]) =>
    v === null ? (
      <StatusBadge tone="warning">{t("warranty.transferable.undecided")}</StatusBadge>
    ) : isOn(v) ? (
      <StatusBadge tone="success">{t("warranty.transferable.yes")}</StatusBadge>
    ) : (
      <StatusBadge>{t("warranty.transferable.no")}</StatusBadge>
    );
  const policyName = useMemo(() => {
    const map = new Map((allPolicies.data ?? []).map((p) => [p.id, p]));
    return (id: number) => localizedField(map.get(id), "name", locale) || `#${id}`;
  }, [allPolicies.data, locale]);

  const policyColumns: Column<WarrantyPolicy>[] = [
    { id: "category", header: t("warranty.columns.category"), cell: (p) => categoryLabel(p.category) },
    { id: "name", header: t("warranty.columns.name"), cell: (p) => <span className="font-medium">{localizedField(p, "name", locale) || `#${p.id}`}</span> },
    { id: "months", header: t("warranty.columns.months"), align: "end", cell: (p) => <span className="num">{p.months ?? "—"}</span> },
    { id: "transferable", header: t("warranty.columns.transferable"), cell: (p) => transferLabel(p.transferable) },
    { id: "active", header: t("warranty.columns.active"), cell: (p) => <ActiveBadge value={p.active} /> },
  ];

  const warrantyColumns: Column<Warranty>[] = [
    {
      id: "unit",
      header: t("warranty.columns.unit"),
      cell: (w) => (
        <Link href={`/units/${w.unit_id}`} className="num text-primary hover:underline">
          {t("common.unitRef", { id: w.unit_id })}
        </Link>
      ),
    },
    {
      id: "sale",
      header: t("warranty.columns.sale"),
      cell: (w) =>
        w.sale_id ? (
          <Link href={`/sales/${w.sale_id}`} className="num text-primary hover:underline">
            {t("payments.forSale", { id: w.sale_id })}
          </Link>
        ) : (
          "—"
        ),
    },
    { id: "policy", header: t("warranty.columns.policy"), cell: (w) => policyName(w.policy_id) },
    { id: "starts", header: t("warranty.columns.starts"), cell: (w) => <span className="num">{formatDate(w.starts_on, locale)}</span> },
    { id: "expires", header: t("warranty.columns.expires"), cell: (w) => <span className="num">{formatDate(w.expires_on, locale)}</span> },
  ];

  return (
    <Tabs value={state.tab} onValueChange={(tab) => setState({ tab, page: 1 })} className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TabsList>
          <TabsTrigger value="policies">{t("warranty.tabs.policies")}</TabsTrigger>
          <TabsTrigger value="warranties">{t("warranty.tabs.warranties")}</TabsTrigger>
        </TabsList>
        {state.tab === "policies" && (
          <Button onClick={() => setSheet("new")}>
            <Plus data-icon="inline-start" />
            {t("warranty.newPolicy")}
          </Button>
        )}
      </div>
      <TabsContent value="policies" className="flex min-h-0 flex-1 flex-col">
        <DataTable
          caption={t("warranty.tabs.policies")}
          columns={policyColumns}
          rows={policies.data?.items}
          getRowId={(p) => p.id}
          getRowLabel={(p) => localizedField(p, "name", locale) || `#${p.id}`}
          isLoading={policies.isLoading}
          isFetching={policies.isFetching}
          error={policies.error}
          onRetry={() => policies.refetch()}
          onRowClick={(p) => setSheet(p)}
          pagination={paginationProps(policies.data?.meta, setState)}
          empty={<EmptyState compact title={t("warranty.emptyPolicies")} />}
        />
      </TabsContent>
      <TabsContent value="warranties" className="flex min-h-0 flex-1 flex-col gap-3">
        <FilterBar>
          <SearchFilter value={state.unit} onChange={(v) => set({ unit: v })} placeholder={t("warranty.filters.unit")} inputMode="numeric" className="sm:w-44" />
          <SearchFilter value={state.sale} onChange={(v) => set({ sale: v })} placeholder={t("warranty.filters.sale")} inputMode="numeric" className="sm:w-44" />
          <ResetFilters count={[state.unit, state.sale].filter(Boolean).length} onReset={() => setState({ unit: null, sale: null, page: 1 })} />
        </FilterBar>
        <DataTable
          caption={t("warranty.tabs.warranties")}
          columns={warrantyColumns}
          rows={warranties.data?.items}
          getRowId={(w) => w.id}
          isLoading={warranties.isLoading}
          isFetching={warranties.isFetching}
          error={warranties.error}
          onRetry={() => warranties.refetch()}
          pagination={paginationProps(warranties.data?.meta, setState)}
          empty={<EmptyState compact title={t("warranty.emptyWarranties")} />}
        />
      </TabsContent>
      {sheet !== null && <PolicyFormSheet key={sheet === "new" ? "new" : sheet.id} policy={sheet === "new" ? undefined : sheet} onClose={() => setSheet(null)} />}
    </Tabs>
  );
}
