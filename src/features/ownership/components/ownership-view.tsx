"use client";

import { ArrowLeftRight, Info, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/shared/data-table/data-table";
import { paginationProps } from "@/components/shared/data-table/list-params";
import { FilterBar, FilterSelect, ResetFilters, SearchFilter } from "@/components/shared/filters";
import { Field, fieldA11y } from "@/components/shared/form/field";
import { FormSheet } from "@/components/shared/form/form-sheet";
import { EmptyState, FormError } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { isOwnershipSource, OWNERSHIP_SOURCES } from "@/config/statuses";
import { usePermissions } from "@/features/auth/hooks";
import type { OwnershipRecord } from "@/features/inventory/types";
import { useErrorMessage } from "@/hooks/use-error-message";
import { Link } from "@/i18n/navigation";
import { toApiError } from "@/lib/api/errors";
import { useIdempotencyKey } from "@/lib/api/idempotency";
import { formatDate } from "@/lib/format/dates";
import { useOwnerships, useOwnershipState, useTransferOwnership } from "../hooks";

function TransferSheet({ onClose }: { onClose: () => void }) {
  const t = useTranslations();
  const errorMessage = useErrorMessage();
  const idempotency = useIdempotencyKey();
  const [unit, setUnit] = useState("");
  const [client, setClient] = useState("");
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const transfer = useTransferOwnership();
  const required = t("validation.required");
  const unitError = submitted && !/^\d+$/.test(unit) ? required : undefined;
  const clientError = submitted && !/^\d+$/.test(client) ? required : undefined;
  const noteError = submitted && !note.trim() ? required : undefined;

  return (
    <FormSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={t("ownership.transferTitle")}
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
        if (!/^\d+$/.test(unit) || !/^\d+$/.test(client) || !note.trim()) return;
        transfer.mutate(
          { unitId: Number(unit), body: { to_client_id: Number(client), note: note.trim() }, key: idempotency.key },
          {
            onSuccess: () => {
              idempotency.renew();
              toast.success(t("ownership.transferred"));
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
          <Button type="submit" disabled={transfer.isPending}>
            {transfer.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
            {t("ownership.transfer")}
          </Button>
        </>
      }
    >
      <p className="flex gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
        <Info aria-hidden className="size-4 shrink-0" />
        {t("ownership.transferBody")}
      </p>
      <Field id="tr-unit" label={t("ownership.unitId")} required error={unitError}>
        <Input {...fieldA11y("tr-unit", unitError)} inputMode="numeric" dir="ltr" value={unit} onChange={(e) => setUnit(e.target.value.replace(/\D/g, ""))} />
      </Field>
      <Field id="tr-client" label={t("ownership.newOwner")} required error={clientError} description={t("newReservation.clientHint")}>
        <Input {...fieldA11y("tr-client", clientError, true)} inputMode="numeric" dir="ltr" value={client} onChange={(e) => setClient(e.target.value.replace(/\D/g, ""))} />
      </Field>
      <Field id="tr-note" label={t("ownership.note")} required error={noteError}>
        <Textarea {...fieldA11y("tr-note", noteError)} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      {transfer.error && <FormError>{errorMessage(transfer.error)}</FormError>}
    </FormSheet>
  );
}

// S22 — Ownership and transfers.
export function OwnershipView() {
  const t = useTranslations();
  const locale = useLocale();
  const { can } = usePermissions();
  const [state, setState] = useOwnershipState();
  const list = useOwnerships(state);
  const [transferring, setTransferring] = useState(false);
  const set = (patch: Partial<typeof state>) => setState({ ...patch, page: 1 });

  const columns: Column<OwnershipRecord>[] = [
    {
      id: "unit",
      header: t("ownership.columns.unit"),
      cell: (o) => (
        <Link href={`/units/${o.unit_id}?tab=ownership`} className="num text-primary hover:underline">
          {t("common.unitRef", { id: o.unit_id })}
        </Link>
      ),
    },
    { id: "owner", header: t("ownership.columns.owner"), cell: (o) => <span className="num">{t("common.clientRef", { id: o.client_id })}</span> },
    { id: "since", header: t("ownership.columns.since"), cell: (o) => <span className="num">{formatDate(o.from_date, locale)}</span> },
    {
      id: "until",
      header: t("ownership.columns.until"),
      cell: (o) => (o.to_date ? <span className="num">{formatDate(o.to_date, locale)}</span> : <StatusBadge tone="success">{t("ownership.current")}</StatusBadge>),
    },
    { id: "source", header: t("ownership.columns.source"), cell: (o) => (isOwnershipSource(o.source) ? t(`statuses.ownershipSource.${o.source}`) : o.source) },
  ];

  return (
    <>
      <p className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        <Info aria-hidden className="size-4 shrink-0" />
        {t("ownership.legacyBanner")}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FilterBar>
          <SearchFilter value={state.unit} onChange={(v) => set({ unit: v })} placeholder={t("ownership.filters.unit")} inputMode="numeric" className="sm:w-44" />
          <SearchFilter value={state.client} onChange={(v) => set({ client: v })} placeholder={t("ownership.filters.client")} inputMode="numeric" className="sm:w-44" />
          <FilterSelect
            label={t("ownership.filters.source")}
            value={state.source}
            onChange={(v) => set({ source: v })}
            options={OWNERSHIP_SOURCES.map((s) => ({ value: s, label: t(`statuses.ownershipSource.${s}`) }))}
          />
          <ResetFilters
            count={[state.unit, state.client, state.source].filter(Boolean).length}
            onReset={() => setState({ unit: null, client: null, source: null, page: 1 })}
          />
        </FilterBar>
        {can("ownership.manage") && (
          <Button onClick={() => setTransferring(true)}>
            <ArrowLeftRight data-icon="inline-start" />
            {t("ownership.transfer")}
          </Button>
        )}
      </div>
      <DataTable
        caption={t("ownership.title")}
        columns={columns}
        rows={list.data?.items}
        getRowId={(o) => o.id}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        error={list.error}
        onRetry={() => list.refetch()}
        pagination={paginationProps(list.data?.meta, setState)}
        empty={<EmptyState compact title={t("ownership.empty")} />}
      />
      {transferring && <TransferSheet onClose={() => setTransferring(false)} />}
    </>
  );
}
