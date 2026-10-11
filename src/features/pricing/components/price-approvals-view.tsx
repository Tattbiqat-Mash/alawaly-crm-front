"use client";

import { Check, Info, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type Column } from "@/components/shared/data-table/data-table";
import { paginationProps } from "@/components/shared/data-table/list-params";
import { FilterBar, FilterSelect, ResetFilters, SearchFilter } from "@/components/shared/filters";
import { EmptyState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { PRICE_CHANGE_STATUSES, isPriceChangeStatus, isStatusSource, priceChangeTone } from "@/config/statuses";
import { usePermissions } from "@/features/auth/hooks";
import type { PriceChange } from "@/features/inventory/types";
import { usePriceFieldLabel } from "@/features/inventory/price-fields";
import { useErrorMessage } from "@/hooks/use-error-message";
import { Link } from "@/i18n/navigation";
import { formatDate, formatDateTime } from "@/lib/format/dates";
import { formatMoney } from "@/lib/format/money";
import { useDecidePriceChange, usePriceApprovals, usePriceApprovalsState } from "../hooks";

type Pending = { change: PriceChange; decision: "approve" | "reject" };

// S05 — Price approvals (four-eyes): a second person decides; the requester cannot.
export function PriceApprovalsView() {
  const t = useTranslations();
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const fieldLabel = usePriceFieldLabel();
  const { can, me } = usePermissions();
  const canDecide = can("pricing.approve");
  const [state, setState] = usePriceApprovalsState();
  const list = usePriceApprovals(state);
  const decide = useDecidePriceChange();
  const [pending, setPending] = useState<Pending | null>(null);

  const set = (patch: Partial<typeof state>) => setState({ ...patch, page: 1 });
  const isMine = (c: PriceChange) => me !== undefined && c.requested_by === me.id;
  const isCrm = (c: PriceChange) => c.source === "bitrix" || c.source === "crm";

  const columns: Column<PriceChange>[] = [
    {
      id: "unit",
      header: t("priceApprovals.columns.unit"),
      cell: (c) => (
        <Link href={`/units/${c.unit_id}`} className="num font-medium text-primary hover:underline">
          {t("common.unitRef", { id: c.unit_id })}
        </Link>
      ),
    },
    { id: "field", header: t("priceApprovals.columns.field"), cell: (c) => fieldLabel(c.field) },
    {
      id: "old",
      header: t("priceApprovals.columns.old"),
      align: "end",
      cell: (c) => <span className="num text-muted-foreground">{formatMoney(c.old_value, locale)}</span>,
    },
    {
      id: "new",
      header: t("priceApprovals.columns.new"),
      align: "end",
      cell: (c) => <span className="num font-semibold">{formatMoney(c.new_value, locale)}</span>,
    },
    {
      id: "reason",
      header: t("priceApprovals.columns.reason"),
      className: "max-w-56 truncate",
      cell: (c) => <span title={c.reason ?? undefined}>{c.reason ?? "—"}</span>,
    },
    {
      id: "requestedBy",
      header: t("priceApprovals.columns.requestedBy"),
      cell: (c) =>
        isMine(c) ? (
          <StatusBadge tone="info">{t("priceApprovals.you")}</StatusBadge>
        ) : (
          <span className="num">{c.requested_by ? t("common.staffRef", { id: c.requested_by }) : "—"}</span>
        ),
    },
    {
      id: "source",
      header: t("priceApprovals.columns.source"),
      cell: (c) => (isStatusSource(c.source) ? t(`statuses.statusSource.${c.source}`) : c.source),
    },
    {
      id: "effective",
      header: t("priceApprovals.columns.effective"),
      cell: (c) => <span className="num">{formatDate(c.effective_from, locale)}</span>,
    },
    {
      id: "decision",
      header: t("priceApprovals.columns.decision"),
      cell: (c) => {
        if (c.status !== "pending") {
          return (
            <div className="flex flex-col gap-0.5">
              {isPriceChangeStatus(c.status) ? (
                <StatusBadge tone={priceChangeTone[c.status]}>{t(`statuses.priceChange.${c.status}`)}</StatusBadge>
              ) : (
                <StatusBadge>{c.status}</StatusBadge>
              )}
              {c.decided_at && <span className="num text-[11px] text-muted-foreground">{formatDateTime(c.decided_at, locale)}</span>}
            </div>
          );
        }
        if (isCrm(c)) return <span className="text-xs text-muted-foreground">{t("priceApprovals.historyOnly")}</span>;
        if (!canDecide) return <StatusBadge tone="warning">{t("statuses.priceChange.pending")}</StatusBadge>;
        const mine = isMine(c);
        return (
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              disabled={mine}
              title={mine ? t("priceApprovals.ownRequest") : undefined}
              onClick={(e) => {
                e.stopPropagation();
                setPending({ change: c, decision: "approve" });
              }}
            >
              <Check data-icon="inline-start" />
              {t("common.approve")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={mine}
              onClick={(e) => {
                e.stopPropagation();
                setPending({ change: c, decision: "reject" });
              }}
            >
              <X data-icon="inline-start" />
              {t("common.reject")}
            </Button>
          </div>
        );
      },
    },
  ];

  const change = pending?.change;
  const activeCount = [state.status !== "pending" ? state.status : null, state.unit].filter(Boolean).length;

  return (
    <>
      {canDecide && (
        <p className="flex items-center gap-2 rounded-lg border border-info/25 bg-info/5 px-3 py-2 text-sm text-info">
          <Info aria-hidden className="size-4 shrink-0" />
          {t("priceApprovals.ownRequestBanner")}
        </p>
      )}
      <FilterBar>
        <FilterSelect
          label={t("common.status")}
          value={state.status === "all" ? null : state.status}
          onChange={(v) => set({ status: v ?? "all" })}
          options={PRICE_CHANGE_STATUSES.map((s) => ({ value: s, label: t(`statuses.priceChange.${s}`) }))}
        />
        <SearchFilter
          value={state.unit}
          onChange={(v) => set({ unit: v })}
          placeholder={t("priceApprovals.columns.unit")}
          inputMode="numeric"
          className="sm:w-40"
        />
        <ResetFilters count={activeCount} onReset={() => setState({ status: "pending", unit: null, page: 1 })} />
      </FilterBar>
      <DataTable
        caption={t("priceApprovals.title")}
        columns={columns}
        rows={list.data?.items}
        getRowId={(c) => c.id}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        error={list.error}
        onRetry={() => list.refetch()}
        pagination={paginationProps(list.data?.meta, setState)}
        empty={<EmptyState compact title={t("priceApprovals.empty")} />}
      />
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPending(null);
            decide.reset();
          }
        }}
        title={pending?.decision === "approve" ? t("priceApprovals.approveTitle") : t("priceApprovals.rejectTitle")}
        consequence={
          change && pending?.decision === "approve"
            ? t("priceApprovals.approveBody", {
                field: fieldLabel(change.field),
                old: formatMoney(change.old_value, locale),
                new: formatMoney(change.new_value, locale),
              })
            : t("priceApprovals.rejectBody")
        }
        confirmLabel={pending?.decision === "approve" ? t("common.approve") : t("common.reject")}
        destructive={pending?.decision === "reject"}
        pending={decide.isPending}
        error={decide.error ? errorMessage(decide.error) : undefined}
        onConfirm={() => {
          if (!pending) return;
          decide.mutate(
            { id: pending.change.id, decision: pending.decision },
            {
              onSuccess: () => {
                toast.success(pending.decision === "approve" ? t("priceApprovals.approved") : t("priceApprovals.rejected"));
                setPending(null);
              },
            },
          );
        }}
      />
    </>
  );
}
