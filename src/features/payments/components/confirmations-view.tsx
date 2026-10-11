"use client";

import { Check, Info, Plus, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type Column } from "@/components/shared/data-table/data-table";
import { EmptyState, ForbiddenState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/features/auth/hooks";
import { PaymentStatusBadge } from "@/features/sales/components/badges";
import { useErrorMessage } from "@/hooks/use-error-message";
import { formatDateTime } from "@/lib/format/dates";
import { formatMoney } from "@/lib/format/money";
import { useApproveTransaction, useRejectTransaction, useTransactionQueue } from "../hooks";
import type { PaymentTransaction } from "../types";
import { usePaymentLabels } from "./labels";
import { RecordPaymentSheet } from "./record-payment-sheet";

const TABS = ["waiting", "mine", "rejected"] as const;
type Tab = (typeof TABS)[number];

// "Recorded by me" is taken from the latest 100 offline transactions: the API documents no
// verified_by filter (see DECISIONS.md).
const TAB_FILTER: Record<Tab, Record<string, string | null>> = {
  waiting: { status: "pending_second_approval" },
  mine: { provider: "offline" },
  rejected: { status: "failed", provider: "offline" },
};

type Decision = { tx: PaymentTransaction; kind: "approve" | "reject" };

// S17 — Confirmations: first check records, a different person approves (four-eyes).
export function ConfirmationsView() {
  const t = useTranslations();
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const labels = usePaymentLabels();
  const { can, me } = usePermissions();
  const canRecord = can("finance.confirm");
  const canApprove = can("finance.confirm.second");
  const canList = can("finance.view");
  const [tab, setTab] = useQueryState("tab", parseAsStringLiteral(TABS).withDefault("waiting").withOptions({ history: "replace" }));
  const queue = useTransactionQueue(TAB_FILTER[tab]);
  const approve = useApproveTransaction();
  const reject = useRejectTransaction();
  const [recording, setRecording] = useState(false);
  const [decision, setDecision] = useState<Decision | null>(null);

  const mine = (tx: PaymentTransaction) => me !== undefined && tx.verified_by === me.id;
  const rows = tab === "mine" ? queue.data?.items.filter(mine) : queue.data?.items;

  const columns: Column<PaymentTransaction>[] = [
    { id: "id", header: t("payments.columns.id"), cell: (tx) => <span className="num font-medium">{tx.id}</span> },
    { id: "for", header: t("payments.columns.for"), cell: (tx) => labels.target(tx) },
    { id: "amount", header: t("payments.columns.amount"), align: "end", cell: (tx) => <span className="num font-semibold">{formatMoney(tx.amount, locale, tx.currency)}</span> },
    { id: "method", header: t("payments.columns.method"), cell: (tx) => labels.method(tx.method) },
    { id: "ref", header: t("payments.columns.reference"), cell: (tx) => <span dir="ltr">{tx.reference ?? "—"}</span> },
    {
      id: "by",
      header: t("confirmations.recordedBy"),
      cell: (tx) => (mine(tx) ? <StatusBadge tone="info">{t("priceApprovals.you")}</StatusBadge> : <span className="num">{labels.staff(tx.verified_by)}</span>),
    },
    { id: "date", header: t("payments.columns.date"), cell: (tx) => <span className="num text-muted-foreground">{formatDateTime(tx.created_at, locale)}</span> },
    {
      id: "decision",
      header: t("priceApprovals.columns.decision"),
      cell: (tx) => {
        if (tx.status !== "pending_second_approval") return <PaymentStatusBadge status={tx.status} />;
        if (!canApprove) return <PaymentStatusBadge status={tx.status} />;
        const own = mine(tx);
        return (
          <div className="flex gap-1.5">
            <Button size="sm" disabled={own} title={own ? t("confirmations.ownBanner") : undefined} onClick={() => setDecision({ tx, kind: "approve" })}>
              <Check data-icon="inline-start" />
              {t("common.approve")}
            </Button>
            <Button size="sm" variant="outline" disabled={own} onClick={() => setDecision({ tx, kind: "reject" })}>
              <X data-icon="inline-start" />
              {t("common.reject")}
            </Button>
          </div>
        );
      },
    },
  ];

  const tx = decision?.tx;
  const pending = approve.isPending || reject.isPending;
  const decisionError = approve.error ?? reject.error;

  return (
    <>
      {canApprove && (
        <p className="flex items-center gap-2 rounded-lg border border-info/25 bg-info/5 px-3 py-2 text-sm text-info">
          <Info aria-hidden className="size-4 shrink-0" />
          {t("confirmations.ownBanner")}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList>
            {TABS.map((k) => (
              <TabsTrigger key={k} value={k}>
                {t(`confirmations.tabs.${k}`)}
                {k === "waiting" && queue.data && tab === "waiting" ? <span className="num ms-1 text-xs">({queue.data.meta.total})</span> : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {canRecord && (
          <Button onClick={() => setRecording(true)}>
            <Plus data-icon="inline-start" />
            {t("confirmations.record")}
          </Button>
        )}
      </div>
      {/* The queue needs finance.view even when the page is open to finance.confirm. */}
      {!canList ? (
        <div className="rounded-xl border bg-card">
          <ForbiddenState compact />
        </div>
      ) : (
        <DataTable
          caption={t(`confirmations.tabs.${tab}`)}
          columns={columns}
          rows={rows}
          getRowId={(r) => r.id}
          isLoading={queue.isLoading}
          isFetching={queue.isFetching}
          error={queue.error}
          onRetry={() => queue.refetch()}
          empty={
            <EmptyState
              compact
              title={tab === "waiting" ? t("confirmations.empty") : tab === "mine" ? t("confirmations.emptyMine") : t("confirmations.emptyRejected")}
            />
          }
        />
      )}

      {recording && <RecordPaymentSheet onClose={() => setRecording(false)} />}

      <ConfirmDialog
        open={decision !== null}
        onOpenChange={(o) => {
          if (!o) {
            setDecision(null);
            approve.reset();
            reject.reset();
          }
        }}
        title={tx ? (decision?.kind === "approve" ? t("confirmations.approveTitle", { id: tx.id }) : t("confirmations.rejectTitle", { id: tx.id })) : ""}
        consequence={
          tx && decision?.kind === "approve"
            ? t("confirmations.approveBody", { amount: formatMoney(tx.amount, locale, tx.currency), method: labels.method(tx.method), reference: tx.reference ?? "—" })
            : t("confirmations.rejectBody")
        }
        confirmLabel={decision?.kind === "approve" ? t("common.approve") : t("common.reject")}
        destructive={decision?.kind === "reject"}
        requireReason={decision?.kind === "reject"}
        pending={pending}
        error={decisionError ? errorMessage(decisionError) : undefined}
        onConfirm={(reason) => {
          if (!decision) return;
          const done = () => setDecision(null);
          if (decision.kind === "approve") {
            approve.mutate(decision.tx.id, {
              onSuccess: () => {
                toast.success(t("confirmations.approved"));
                done();
              },
            });
          } else {
            reject.mutate(
              { id: decision.tx.id, reason },
              {
                onSuccess: () => {
                  toast.success(t("confirmations.rejected"));
                  done();
                },
              },
            );
          }
        }}
      />
    </>
  );
}
