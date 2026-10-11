"use client";

import { Info, Loader2, RotateCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { parseAsInteger, useQueryState } from "nuqs";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/shared/data-table/data-table";
import { Field, fieldA11y } from "@/components/shared/form/field";
import { FormSheet } from "@/components/shared/form/form-sheet";
import { EmptyState, FormError } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { usePermissions } from "@/features/auth/hooks";
import { useErrorMessage } from "@/hooks/use-error-message";
import { toApiError } from "@/lib/api/errors";
import { useIdempotencyKey } from "@/lib/api/idempotency";
import { formatDateTime } from "@/lib/format/dates";
import { addMoney, compareMoney, formatMoney, fromMinor, subtractMoney, toMinor } from "@/lib/format/money";
import { useRefund, useTransactionQueue } from "../hooks";
import type { PaymentTransaction } from "../types";
import { usePaymentLabels } from "./labels";

/** Refunds point back at their payment through `reference: "refund-of-{id}"` (recorded example). */
const refundedSoFar = (tx: PaymentTransaction, refunds: PaymentTransaction[]) =>
  addMoney(...refunds.filter((r) => r.reference === `refund-of-${tx.id}`).map((r) => r.amount));

function RefundSheet({ tx, refunds, onClose }: { tx: PaymentTransaction; refunds: PaymentTransaction[]; onClose: () => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const refund = useRefund();
  const idempotency = useIdempotencyKey();
  const already = refundedSoFar(tx, refunds);
  const refundable = subtractMoney(tx.amount, already);
  const [amount, setAmount] = useState(refundable);
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const minor = toMinor(amount);
  const amountOk = /^\d+(\.\d{1,2})?$/.test(amount.trim()) && minor !== null && minor > BigInt(0) && compareMoney(amount, refundable) <= 0;
  const amountError = submitted && !amountOk ? t("refunds.amountInvalid", { max: formatMoney(refundable, locale) }) : undefined;
  const reasonError = submitted && !reason.trim() ? t("common.reasonRequired") : undefined;

  return (
    <FormSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={t("refunds.formTitle", { id: tx.id })}
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
        if (!amountOk || !reason.trim()) return;
        refund.mutate(
          { id: tx.id, body: { amount: fromMinor(minor!), reason: reason.trim() }, key: idempotency.key },
          {
            onSuccess: () => {
              idempotency.renew();
              toast.success(t("refunds.recorded"));
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
          <Button type="submit" variant="destructive" disabled={refund.isPending}>
            {refund.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
            {t("refunds.submit")}
          </Button>
        </>
      }
    >
      <dl className="grid grid-cols-3 gap-3">
        {(
          [
            ["paid", tx.amount],
            ["alreadyRefunded", already],
            ["refundable", refundable],
          ] as const
        ).map(([k, v]) => (
          <div key={k} className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">{t(`refunds.${k}`)}</dt>
            <dd className="num mt-1 font-semibold">{formatMoney(v, locale, tx.currency)}</dd>
          </div>
        ))}
      </dl>
      <p className="flex gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
        <Info aria-hidden className="size-4 shrink-0" />
        {t("refunds.recordOnly")}
      </p>
      <Field id="rf-amount" label={t("refunds.amount")} required error={amountError}>
        <Input {...fieldA11y("rf-amount", amountError)} inputMode="decimal" dir="ltr" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} />
      </Field>
      <Field id="rf-reason" label={t("common.reason")} required error={reasonError}>
        <Textarea {...fieldA11y("rf-reason", reasonError)} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      {refund.error && (
        <FormError>
          {errorMessage(refund.error)}
          {toApiError(refund.error).code === "REFUND_EXCEEDS_PAYMENT" && toApiError(refund.error).details?.refundable !== undefined
            ? ` ${formatMoney(toApiError(refund.error).details!.refundable as string, locale)}`
            : null}
        </FormError>
      )}
    </FormSheet>
  );
}

// S18 — Refunds (recorded only). The API refunds a transaction id, so the screen starts from
// the list of paid transactions (or ?tx= from the transactions screen).
export function RefundsView() {
  const t = useTranslations();
  const locale = useLocale();
  const labels = usePaymentLabels();
  const { can } = usePermissions();
  const canRefund = can("finance.refund");
  const paid = useTransactionQueue({ status: "succeeded", type: "payment" });
  const refunds = useTransactionQueue({ type: "refund" });
  const [txId, setTxId] = useQueryState("tx", parseAsInteger.withOptions({ history: "replace" }));
  const selected = paid.data?.items.find((x) => x.id === txId) ?? null;
  const refundList = refunds.data?.items ?? [];

  const columns: Column<PaymentTransaction>[] = [
    { id: "id", header: t("payments.columns.id"), cell: (tx) => <span className="num font-medium">{tx.id}</span> },
    { id: "for", header: t("payments.columns.for"), cell: (tx) => labels.target(tx) },
    { id: "amount", header: t("refunds.paid"), align: "end", cell: (tx) => <span className="num">{formatMoney(tx.amount, locale, tx.currency)}</span> },
    {
      id: "refunded",
      header: t("refunds.alreadyRefunded"),
      align: "end",
      cell: (tx) => <span className="num text-muted-foreground">{formatMoney(refundedSoFar(tx, refundList), locale, tx.currency)}</span>,
    },
    { id: "method", header: t("payments.columns.method"), cell: (tx) => labels.method(tx.method) },
    { id: "date", header: t("payments.columns.date"), cell: (tx) => <span className="num text-muted-foreground">{formatDateTime(tx.created_at, locale)}</span> },
    {
      id: "action",
      header: t("common.actions"),
      cell: (tx) =>
        canRefund && compareMoney(subtractMoney(tx.amount, refundedSoFar(tx, refundList)), "0") > 0 ? (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              setTxId(tx.id);
            }}
          >
            <RotateCcw data-icon="inline-start" />
            {t("payments.refund")}
          </Button>
        ) : null,
    },
  ];

  return (
    <>
      <p className="text-sm text-muted-foreground">{t("refunds.pick")}</p>
      <DataTable
        caption={t("refunds.title")}
        columns={columns}
        rows={paid.data?.items}
        getRowId={(tx) => tx.id}
        isLoading={paid.isLoading}
        isFetching={paid.isFetching}
        error={paid.error}
        onRetry={() => paid.refetch()}
        empty={<EmptyState compact title={t("refunds.empty")} />}
      />
      {selected && canRefund && <RefundSheet key={selected.id} tx={selected} refunds={refundList} onClose={() => setTxId(null)} />}
    </>
  );
}
