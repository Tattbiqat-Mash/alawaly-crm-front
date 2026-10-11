"use client";

import { Loader2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/shared/data-table/data-table";
import { paginationProps } from "@/components/shared/data-table/list-params";
import { FilterBar } from "@/components/shared/filters";
import { Field } from "@/components/shared/form/field";
import { FormSheet } from "@/components/shared/form/form-sheet";
import { EmptyState, FormError } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActiveBadge } from "@/features/catalog/components/active-badge";
import { usePermissions } from "@/features/auth/hooks";
import { useErrorMessage } from "@/hooks/use-error-message";
import { toApiError } from "@/lib/api/errors";
import { useIdempotencyKey } from "@/lib/api/idempotency";
import { isOn } from "@/lib/format/localized";
import type { Tenant } from "../api";
import { useMandate, useMandatePick, useSaveTenant, useTenants } from "../hooks";
import { MandatePicker, MandateScopeBanner, mandateAllows } from "./rental-shared";

function TenantSheet({ mandateId, tenant, onClose }: { mandateId: number; tenant?: Tenant; onClose: () => void }) {
  const t = useTranslations();
  const errorMessage = useErrorMessage();
  const save = useSaveTenant(mandateId);
  const idempotency = useIdempotencyKey();
  const [v, setV] = useState({ name: tenant?.name ?? "", phone: tenant?.phone ?? "", email: tenant?.email ?? "", note: tenant?.nationality_note ?? "", active: tenant ? isOn(tenant.active) : true });
  const [submitted, setSubmitted] = useState(false);
  return (
    <FormSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={tenant ? t("tenants.edit") : t("tenants.add")}
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
        if (!v.name.trim()) return;
        save.mutate(
          {
            id: tenant?.id ?? null,
            body: { name: v.name.trim(), phone: v.phone.trim() || null, email: v.email.trim() || null, nationality_note: v.note.trim() || null, active: v.active },
            key: idempotency.key,
          },
          {
            onSuccess: () => {
              idempotency.renew();
              toast.success(tenant ? t("tenants.saved") : t("tenants.created"));
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
          <Button type="submit" disabled={save.isPending}>
            {save.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
            {tenant ? t("common.save") : t("common.create")}
          </Button>
        </>
      }
    >
      <fieldset disabled={save.isPending} className="grid gap-4">
        <Field id="tn-name" label={t("tenants.fields.name")} required error={submitted && !v.name.trim() ? t("validation.required") : undefined}>
          <Input id="tn-name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        </Field>
        <Field id="tn-phone" label={t("tenants.fields.phone")}>
          <Input id="tn-phone" type="tel" dir="ltr" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />
        </Field>
        <Field id="tn-email" label={t("tenants.fields.email")}>
          <Input id="tn-email" type="email" dir="ltr" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
        </Field>
        <Field id="tn-note" label={t("tenants.fields.note")}>
          <Input id="tn-note" value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} />
        </Field>
        <div className="flex items-center gap-2">
          <Checkbox id="tn-active" checked={v.active} onCheckedChange={(c) => setV({ ...v, active: c === true })} />
          <Label htmlFor="tn-active">{t("tenants.fields.active")}</Label>
        </div>
      </fieldset>
      {save.error && (
        <>
          <MandateScopeBanner error={save.error} />
          {toApiError(save.error).code !== "MANDATE_SCOPE" && <FormError>{errorMessage(save.error)}</FormError>}
        </>
      )}
    </FormSheet>
  );
}

// S32 — Tenants of a mandate (needs the manage_tenants capability to edit).
export function TenantsView() {
  const t = useTranslations();
  const { can } = usePermissions();
  const [state, setState] = useMandatePick();
  const mandate = useMandate(state.mandate);
  const list = useTenants(state.mandate, state);
  const [sheet, setSheet] = useState<null | "new" | Tenant>(null);
  const editable = can("rental.manage") && mandateAllows(mandate.data, "manage_tenants");

  const columns: Column<Tenant>[] = [
    { id: "name", header: t("tenants.columns.name"), cell: (x) => <span className="font-medium">{x.name}</span> },
    { id: "phone", header: t("tenants.columns.phone"), cell: (x) => <span dir="ltr">{x.phone ?? "—"}</span> },
    { id: "email", header: t("tenants.columns.email"), cell: (x) => <span dir="ltr">{x.email ?? "—"}</span> },
    { id: "active", header: t("tenants.columns.active"), cell: (x) => <ActiveBadge value={x.active} /> },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FilterBar>
          <MandatePicker value={state.mandate} onChange={(mandate) => setState({ mandate, page: 1 })} />
        </FilterBar>
        {editable && (
          <Button onClick={() => setSheet("new")}>
            <Plus data-icon="inline-start" />
            {t("tenants.add")}
          </Button>
        )}
      </div>
      {mandate.data && <MandateScopeBanner mandate={mandate.data} capability="manage_tenants" error={list.error} />}
      {state.mandate === null ? (
        <div className="rounded-xl border bg-card">
          <EmptyState compact title={t("rentals.pickMandate")} />
        </div>
      ) : (
        <DataTable
          caption={t("tenants.title")}
          columns={columns}
          rows={list.data?.items}
          getRowId={(x) => x.id}
          getRowLabel={(x) => x.name}
          isLoading={list.isLoading}
          isFetching={list.isFetching}
          error={list.error && toApiError(list.error).code !== "MANDATE_SCOPE" ? list.error : undefined}
          onRetry={() => list.refetch()}
          onRowClick={editable ? (x) => setSheet(x) : undefined}
          pagination={paginationProps(list.data?.meta, setState)}
          empty={<EmptyState compact title={t("tenants.empty")} />}
        />
      )}
      {sheet !== null && state.mandate !== null && (
        <TenantSheet key={sheet === "new" ? "new" : sheet.id} mandateId={state.mandate} tenant={sheet === "new" ? undefined : sheet} onClose={() => setSheet(null)} />
      )}
    </>
  );
}
