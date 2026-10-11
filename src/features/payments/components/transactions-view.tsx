"use client";

import { useMutation } from "@tanstack/react-query";
import { Download, Loader2, RotateCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/shared/data-table/data-table";
import { paginationProps } from "@/components/shared/data-table/list-params";
import { FilterBar, FilterSelect, ResetFilters, SearchFilter } from "@/components/shared/filters";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PAYMENT_STATUSES } from "@/config/statuses";
import { usePermissions } from "@/features/auth/hooks";
import { PaymentStatusBadge } from "@/features/sales/components/badges";
import { useEndSide } from "@/hooks/use-end-side";
import { useErrorMessage } from "@/hooks/use-error-message";
import { Link } from "@/i18n/navigation";
import { formatDateTime } from "@/lib/format/dates";
import { formatMoney } from "@/lib/format/money";
import { cn } from "@/lib/utils";
import { financeApi } from "../api";
import { useTransactions, useTransactionsState } from "../hooks";
import type { PaymentTransaction } from "../types";
import { usePaymentLabels } from "./labels";

export function TransactionsActions() {
  const t = useTranslations();
  const { can } = usePermissions();
  const errorMessage = useErrorMessage();
  const exportCsv = useMutation({ mutationFn: financeApi.exportPayments, onError: (e) => toast.error(errorMessage(e)) });
  if (!can("reports.view")) return null;
  return (
    <Button variant="outline" onClick={() => exportCsv.mutate()} disabled={exportCsv.isPending}>
      {exportCsv.isPending ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Download data-icon="inline-start" />}
      {exportCsv.isPending ? t("common.exporting") : t("common.export")}
    </Button>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-2.5 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-end">{children}</dd>
    </div>
  );
}

function TransactionSheet({ tx, onClose }: { tx: PaymentTransaction | null; onClose: () => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const side = useEndSide();
  const labels = usePaymentLabels();
  const { can } = usePermissions();
  const refundable = tx && tx.type === "payment" && tx.status === "succeeded" && can("finance.refund");
  return (
    <Sheet open={tx !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side={side} className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        {tx && (
          <>
            <SheetHeader className="border-b">
              <SheetTitle>{t("payments.detailTitle", { id: tx.id })}</SheetTitle>
              <SheetDescription asChild>
                <div>
                  <PaymentStatusBadge status={tx.status} />
                </div>
              </SheetDescription>
            </SheetHeader>
            <dl className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
              <Row label={t("payments.columns.amount")}>
                <span className="num font-semibold">{formatMoney(tx.amount, locale, tx.currency)}</span>
              </Row>
              <Row label={t("payments.columns.type")}>{labels.type(tx)}</Row>
              <Row label={t("payments.columns.for")}>
                {tx.sale_id ? (
                  <Link href={`/sales/${tx.sale_id}`} className="text-primary hover:underline">
                    {labels.target(tx)}
                  </Link>
                ) : (
                  labels.target(tx)
                )}
              </Row>
              <Row label={t("payments.columns.provider")}>{labels.provider(tx.provider)}</Row>
              <Row label={t("payments.columns.method")}>{labels.method(tx.method)}</Row>
              <Row label={t("payments.columns.reference")}>
                <span dir="ltr">{tx.reference ?? "—"}</span>
              </Row>
              <Row label={t("payments.columns.verifiedBy")}>
                {tx.status === "pending_second_approval"
                  ? t("payments.awaiting")
                  : t("payments.verified", { first: labels.staff(tx.verified_by), second: labels.staff(tx.second_approver_id) })}
              </Row>
              {tx.note && <Row label={t("payments.note")}>{tx.note}</Row>}
              <Row label={t("payments.columns.date")}>
                <span className="num">{formatDateTime(tx.created_at, locale)}</span>
              </Row>
            </dl>
            {refundable && (
              <SheetFooter className="border-t">
                <Button variant="outline" asChild>
                  <Link href={`/payments/refunds?tx=${tx.id}`}>
                    <RotateCcw data-icon="inline-start" />
                    {t("payments.refund")}
                  </Link>
                </Button>
              </SheetFooter>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// S16 — Payment transactions.
export function TransactionsView() {
  const t = useTranslations();
  const locale = useLocale();
  const labels = usePaymentLabels();
  const [state, setState] = useTransactionsState();
  const list = useTransactions(state);
  const [selected, setSelected] = useState<PaymentTransaction | null>(null);
  const set = (patch: Partial<typeof state>) => setState({ ...patch, page: 1 });

  const columns: Column<PaymentTransaction>[] = [
    { id: "id", header: t("payments.columns.id"), cell: (tx) => <span className="num font-medium">{tx.id}</span> },
    { id: "type", header: t("payments.columns.type"), cell: (tx) => labels.type(tx) },
    { id: "provider", header: t("payments.columns.provider"), cell: (tx) => labels.provider(tx.provider) },
    {
      id: "amount",
      header: t("payments.columns.amount"),
      align: "end",
      cell: (tx) => (
        <span className={cn("num", tx.type === "refund" && "text-destructive")}>
          {tx.type === "refund" ? "−" : ""}
          {formatMoney(tx.amount, locale, tx.currency)}
        </span>
      ),
    },
    {
      id: "status",
      header: t("payments.columns.status"),
      cell: (tx) => (
        <span title={tx.status === "review" ? t("payments.reviewHint") : undefined}>
          <PaymentStatusBadge status={tx.status} />
        </span>
      ),
    },
    { id: "verified", header: t("payments.columns.verifiedBy"), cell: (tx) => <span className="num">{labels.staff(tx.verified_by)}</span> },
    { id: "for", header: t("payments.columns.for"), cell: (tx) => labels.target(tx) },
    { id: "date", header: t("payments.columns.date"), cell: (tx) => <span className="num text-muted-foreground">{formatDateTime(tx.created_at, locale)}</span> },
  ];

  return (
    <>
      <FilterBar>
        <FilterSelect
          label={t("payments.filters.status")}
          value={state.status}
          onChange={(v) => set({ status: v })}
          options={PAYMENT_STATUSES.map((s) => ({ value: s, label: t(`statuses.payment.${s}`) }))}
        />
        <FilterSelect
          label={t("payments.filters.provider")}
          value={state.provider}
          onChange={(v) => set({ provider: v })}
          options={["offline", "generic_hmac"].map((p) => ({ value: p, label: labels.provider(p) }))}
        />
        <FilterSelect
          label={t("payments.filters.type")}
          value={state.type}
          onChange={(v) => set({ type: v })}
          options={[
            { value: "payment", label: t("statuses.paymentType.payment") },
            { value: "refund", label: t("statuses.paymentType.refund") },
          ]}
        />
        <SearchFilter value={state.sale} onChange={(v) => set({ sale: v })} placeholder={t("payments.filters.sale")} inputMode="numeric" className="sm:w-40" />
        <ResetFilters
          count={[state.status, state.provider, state.type, state.sale].filter(Boolean).length}
          onReset={() => setState({ status: null, provider: null, type: null, sale: null, page: 1 })}
        />
      </FilterBar>
      <DataTable
        caption={t("payments.title")}
        columns={columns}
        rows={list.data?.items}
        getRowId={(tx) => tx.id}
        getRowLabel={(tx) => t("payments.detailTitle", { id: tx.id })}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        error={list.error}
        onRetry={() => list.refetch()}
        onRowClick={setSelected}
        pagination={paginationProps(list.data?.meta, setState)}
        empty={<EmptyState compact title={t("payments.empty")} />}
      />
      <TransactionSheet tx={selected} onClose={() => setSelected(null)} />
    </>
  );
}
