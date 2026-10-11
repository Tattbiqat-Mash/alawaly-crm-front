"use client";

import { AlertTriangle, Loader2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type Column } from "@/components/shared/data-table/data-table";
import { paginationProps } from "@/components/shared/data-table/list-params";
import { Field } from "@/components/shared/form/field";
import { FormSheet } from "@/components/shared/form/form-sheet";
import { EmptyState, ErrorState, FormError } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ActiveBadge } from "@/features/catalog/components/active-badge";
import { useErrorMessage } from "@/hooks/use-error-message";
import { toApiError } from "@/lib/api/errors";
import { useIdempotencyKey } from "@/lib/api/idempotency";
import { isOn } from "@/lib/format/localized";
import type { Role, RoleInput } from "../api";
import { usePermissionCatalogue, useRoles, useRolesState, useSaveRole } from "../hooks";

/** Permissions grouped by area ("finance.confirm.second" → finance / confirm.second), in catalogue order. */
function groupByArea(names: string[]) {
  const groups = new Map<string, string[]>();
  for (const name of names) {
    const area = name.split(".")[0];
    groups.set(area, [...(groups.get(area) ?? []), name]);
  }
  return [...groups.entries()];
}

function useAreaLabel() {
  const t = useTranslations("roles.areas");
  type Area = Parameters<typeof t>[0];
  return (area: string) => (t.has(area as Area) ? t(area as Area) : area);
}

/** Built from GET /permissions: the API rejects unknown names. */
function PermissionChecklist({ value, onChange, disabled }: { value: string[]; onChange: (next: string[]) => void; disabled?: boolean }) {
  const t = useTranslations("roles");
  const areaLabel = useAreaLabel();
  const catalogue = usePermissionCatalogue();
  if (catalogue.isLoading) return <Skeleton className="h-64 w-full" />;
  if (catalogue.error) return <ErrorState compact error={catalogue.error} onRetry={() => catalogue.refetch()} />;
  const selected = new Set(value);
  const toggle = (list: string[], on: boolean) => onChange(on ? [...new Set([...value, ...list])] : value.filter((p) => !list.includes(p)));

  return (
    <fieldset disabled={disabled} className="grid gap-2">
      <legend className="mb-1 text-sm font-medium">{t("fields.permissions")}</legend>
      {groupByArea(catalogue.data ?? []).map(([area, list]) => {
        const count = list.filter((p) => selected.has(p)).length;
        const groupId = `perm-area-${area}`;
        return (
          <div key={area} className="rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Checkbox id={groupId} checked={count === list.length ? true : count > 0 ? "indeterminate" : false} onCheckedChange={(c) => toggle(list, c === true)} />
              <Label htmlFor={groupId} className="font-medium">
                {areaLabel(area)}
              </Label>
              <span className="num ms-auto text-xs text-muted-foreground">
                {count}/{list.length}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 ps-6">
              {list.map((p) => (
                <div key={p} className="flex items-center gap-1.5">
                  <Checkbox id={`perm-${p}`} checked={selected.has(p)} onCheckedChange={(c) => toggle([p], c === true)} />
                  <Label htmlFor={`perm-${p}`} className="font-mono text-xs font-normal" dir="ltr">
                    {p.slice(area.length + 1) || p}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </fieldset>
  );
}

function RoleSheet({ role, onClose }: { role?: Role; onClose: () => void }) {
  const t = useTranslations();
  const errorMessage = useErrorMessage();
  const save = useSaveRole();
  const idempotency = useIdempotencyKey();
  const isNew = !role;
  const hadAll = role?.permissions.includes("*") ?? false;
  const [v, setV] = useState({
    en: role?.role_nameEn ?? "",
    ar: role?.role_nameAr ?? "",
    all: hadAll,
    permissions: (role?.permissions ?? []).filter((p) => p !== "*"),
    active: role ? isOn(role.active) : true,
  });
  const [submitted, setSubmitted] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const required = t("validation.required");
  const permissions = v.all ? ["*"] : v.permissions;
  const ok = v.en.trim() && v.ar.trim() && permissions.length > 0;
  const bothConfirm = !v.all && v.permissions.includes("finance.confirm") && v.permissions.includes("finance.confirm.second");

  const submit = () => {
    const body: RoleInput = { role_nameEn: v.en.trim(), role_nameAr: v.ar.trim(), permissions };
    if (!isNew) body.active = v.active;
    save.mutate(
      { id: role?.id ?? null, body, key: idempotency.key },
      {
        onSuccess: () => {
          idempotency.renew();
          toast.success(isNew ? t("roles.created") : t("roles.saved"));
          onClose();
        },
        onError: (err) => {
          setConfirmDeactivate(false);
          if (toApiError(err).code === "IDEMPOTENCY_CONFLICT") idempotency.renew();
        },
      },
    );
  };

  return (
    <>
      <FormSheet
        open
        onOpenChange={(o) => !o && onClose()}
        title={isNew ? t("roles.new") : t("roles.editTitle")}
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
          if (!ok) return;
          // Deactivating removes access for everyone holding the role: confirm first.
          if (role && isOn(role.active) && !v.active) setConfirmDeactivate(true);
          else submit();
        }}
        footer={
          <>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {isNew ? t("common.create") : t("common.save")}
            </Button>
          </>
        }
      >
        <fieldset disabled={save.isPending} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="rl-en" label={t("roles.fields.nameEn")} required error={submitted && !v.en.trim() ? required : undefined}>
              <Input id="rl-en" dir="ltr" value={v.en} onChange={(e) => setV({ ...v, en: e.target.value })} />
            </Field>
            <Field id="rl-ar" label={t("roles.fields.nameAr")} required error={submitted && !v.ar.trim() ? required : undefined}>
              <Input id="rl-ar" dir="rtl" value={v.ar} onChange={(e) => setV({ ...v, ar: e.target.value })} />
            </Field>
          </div>
          {!isNew && (
            <div className="flex items-center gap-2">
              <Checkbox id="rl-active" checked={v.active} onCheckedChange={(c) => setV({ ...v, active: c === true })} />
              <Label htmlFor="rl-active">{t("roles.fields.active")}</Label>
            </div>
          )}
          {hadAll && (
            <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3">
              <Checkbox id="rl-all" checked={v.all} onCheckedChange={(c) => setV({ ...v, all: c === true })} />
              <Label htmlFor="rl-all" className="grid gap-0.5 font-normal">
                <span className="font-medium">{t("roles.fullAccess")}</span>
                <span className="text-xs text-muted-foreground">{t("roles.fullAccessHint")}</span>
              </Label>
            </div>
          )}
        </fieldset>
        {!v.all && <PermissionChecklist value={v.permissions} onChange={(next) => setV({ ...v, permissions: next })} disabled={save.isPending} />}
        {submitted && permissions.length === 0 && <FormError>{t("roles.pickOne")}</FormError>}
        {bothConfirm && (
          <p className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-warning">
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
            {t("roles.bothConfirmWarning")}
          </p>
        )}
        {save.error && !confirmDeactivate && <FormError>{errorMessage(save.error)}</FormError>}
      </FormSheet>
      <ConfirmDialog
        open={confirmDeactivate}
        onOpenChange={setConfirmDeactivate}
        title={t("roles.deactivateTitle")}
        consequence={t("roles.deactivateBody")}
        confirmLabel={t("roles.deactivate")}
        destructive
        pending={save.isPending}
        onConfirm={submit}
      />
    </>
  );
}

// S37 — Roles and permissions.
export function RolesView() {
  const t = useTranslations();
  const [state, setState] = useRolesState();
  const list = useRoles(state);
  const [sheet, setSheet] = useState<null | "new" | Role>(null);

  const columns: Column<Role>[] = [
    {
      id: "name",
      header: t("roles.columns.name"),
      cell: (r) => (
        <span className="font-medium">
          <span dir="ltr">{r.role_nameEn ?? "—"}</span> / <span dir="rtl">{r.role_nameAr ?? "—"}</span>
        </span>
      ),
    },
    {
      id: "permissions",
      header: t("roles.columns.permissions"),
      cell: (r) =>
        r.permissions.includes("*") ? <Badge variant="secondary">{t("roles.allPermissions")}</Badge> : <span className="num">{t("roles.permissionCount", { count: r.permissions.length })}</span>,
    },
    { id: "active", header: t("roles.columns.active"), cell: (r) => <ActiveBadge value={r.active} /> },
  ];

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setSheet("new")}>
          <Plus data-icon="inline-start" />
          {t("roles.new")}
        </Button>
      </div>
      <DataTable
        caption={t("roles.title")}
        columns={columns}
        rows={list.data?.items}
        getRowId={(r) => r.id}
        getRowLabel={(r) => r.role_nameEn ?? String(r.id)}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        error={list.error}
        onRetry={() => list.refetch()}
        onRowClick={(r) => setSheet(r)}
        pagination={paginationProps(list.data?.meta, setState)}
        empty={<EmptyState compact title={t("roles.empty")} />}
      />
      {sheet !== null && <RoleSheet key={sheet === "new" ? "new" : sheet.id} role={sheet === "new" ? undefined : sheet} onClose={() => setSheet(null)} />}
    </>
  );
}
