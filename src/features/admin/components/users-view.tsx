"use client";

import { Eye, EyeOff, Loader2, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type Column } from "@/components/shared/data-table/data-table";
import { paginationProps } from "@/components/shared/data-table/list-params";
import { FilterBar, FilterSelect, ResetFilters } from "@/components/shared/filters";
import { Field } from "@/components/shared/form/field";
import { FormSheet } from "@/components/shared/form/form-sheet";
import { EmptyState, FormError } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ActiveBadge } from "@/features/catalog/components/active-badge";
import { usePermissions } from "@/features/auth/hooks";
import { useErrorMessage } from "@/hooks/use-error-message";
import { fieldErrors, toApiError } from "@/lib/api/errors";
import { useIdempotencyKey } from "@/lib/api/idempotency";
import { formatDateTime } from "@/lib/format/dates";
import { isOn, localizedField } from "@/lib/format/localized";
import type { Role, StaffUser, UserInput } from "../api";
import { useAllRoles, useSaveUser, useUsers, useUsersState } from "../hooks";

const MIN_PASSWORD = 12;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function RoleSelect({ id, roles, value, onChange }: { id: string; roles: Role[] | undefined; value: string; onChange: (v: string) => void }) {
  const t = useTranslations();
  const locale = useLocale();
  // Without admin.roles the list is not readable: fall back to the role number.
  if (!roles) return <Input id={id} inputMode="numeric" dir="ltr" value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))} />;
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={t("users.fields.role")} />
      </SelectTrigger>
      <SelectContent>
        {roles.map((r) => (
          <SelectItem key={r.id} value={String(r.id)} disabled={!isOn(r.active)}>
            {localizedField(r, "role_name", locale) || `#${r.id}`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function PasswordInput({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  const t = useTranslations("users");
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <Input id={id} type={shown ? "text" : "password"} autoComplete="new-password" dir="ltr" className="pe-10" value={value} onChange={(e) => onChange(e.target.value)} />
      <Button type="button" variant="ghost" size="icon" className="absolute end-0 top-0" aria-label={shown ? t("hidePassword") : t("showPassword")} onClick={() => setShown(!shown)}>
        {shown ? <EyeOff /> : <Eye />}
      </Button>
    </div>
  );
}

function UserSheet({ user, roles, onClose }: { user?: StaffUser; roles: Role[] | undefined; onClose: () => void }) {
  const t = useTranslations();
  const errorMessage = useErrorMessage();
  const save = useSaveUser();
  const idempotency = useIdempotencyKey();
  const isNew = !user;
  const [v, setV] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    role: user?.role_id ? String(user.role_id) : "",
    branch: user?.branch_id ? String(user.branch_id) : "",
    password: "",
    active: user ? isOn(user.active) : true,
  });
  const [submitted, setSubmitted] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const server = save.error ? fieldErrors(toApiError(save.error)) : undefined;
  const required = t("validation.required");

  const errors = {
    name: !v.name.trim() ? required : undefined,
    email: isNew && !EMAIL.test(v.email.trim()) ? t("users.emailInvalid") : undefined,
    role: !v.role ? required : undefined,
    branch: isNew && !v.branch ? required : undefined,
    // Optional on edit (reset only when filled).
    password: (isNew || v.password) && v.password.length < MIN_PASSWORD ? t("users.passwordShort", { min: MIN_PASSWORD }) : undefined,
  };
  const shown = (k: keyof typeof errors) => (submitted ? errors[k] : undefined) ?? server?.[k === "role" ? "role_id" : k === "branch" ? "branch_id" : k]?.[0];
  const ok = Object.values(errors).every((e) => !e);

  const submit = () => {
    const body: UserInput = isNew
      ? { name: v.name.trim(), email: v.email.trim(), password: v.password, role_id: Number(v.role), branch_id: Number(v.branch) }
      : {
          ...(v.name.trim() !== user.name ? { name: v.name.trim() } : {}),
          ...(Number(v.role) !== user.role_id ? { role_id: Number(v.role) } : {}),
          ...(v.active !== isOn(user.active) ? { active: v.active } : {}),
          ...(v.password ? { password: v.password } : {}),
        };
    if (!isNew && Object.keys(body).length === 0) return onClose();
    save.mutate(
      { id: user?.id ?? null, body, key: idempotency.key },
      {
        onSuccess: () => {
          idempotency.renew();
          toast.success(isNew ? t("users.created") : t("users.saved"));
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
        title={isNew ? t("users.new") : t("users.editTitle")}
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
          if (!ok) return;
          // Deactivating ends the person's sessions immediately: confirm first.
          if (user && isOn(user.active) && !v.active) setConfirmDeactivate(true);
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
          <Field id="us-name" label={t("users.fields.name")} required error={shown("name")}>
            <Input id="us-name" autoComplete="off" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
          </Field>
          <Field id="us-email" label={t("users.fields.email")} required={isNew} error={shown("email")} description={isNew ? undefined : t("users.emailFixed")}>
            <Input id="us-email" type="email" autoComplete="off" dir="ltr" disabled={!isNew} value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="us-role" label={t("users.fields.role")} required error={shown("role")}>
              <RoleSelect id="us-role" roles={roles} value={v.role} onChange={(role) => setV({ ...v, role })} />
            </Field>
            {isNew && (
              <Field id="us-branch" label={t("users.fields.branch")} required error={shown("branch")}>
                <Input id="us-branch" inputMode="numeric" dir="ltr" value={v.branch} onChange={(e) => setV({ ...v, branch: e.target.value.replace(/\D/g, "") })} />
              </Field>
            )}
          </div>
          <Field
            id="us-password"
            label={isNew ? t("users.fields.password") : t("users.fields.resetPassword")}
            required={isNew}
            error={shown("password")}
            description={t("users.passwordHint", { min: MIN_PASSWORD })}
          >
            <PasswordInput id="us-password" value={v.password} onChange={(password) => setV({ ...v, password })} />
          </Field>
          {!isNew && (
            <div className="flex items-center gap-2">
              <Checkbox id="us-active" checked={v.active} onCheckedChange={(c) => setV({ ...v, active: c === true })} />
              <Label htmlFor="us-active">{t("users.fields.active")}</Label>
            </div>
          )}
        </fieldset>
        {save.error && !server && !confirmDeactivate && <FormError>{errorMessage(save.error)}</FormError>}
      </FormSheet>
      <ConfirmDialog
        open={confirmDeactivate}
        onOpenChange={setConfirmDeactivate}
        title={t("users.deactivateTitle", { name: user?.name ?? "" })}
        consequence={t("users.deactivateBody")}
        confirmLabel={t("users.deactivate")}
        destructive
        pending={save.isPending}
        onConfirm={submit}
      />
    </>
  );
}

// S38 — Staff users.
export function UsersView() {
  const t = useTranslations();
  const locale = useLocale();
  const { can } = usePermissions();
  const [state, setState] = useUsersState();
  const list = useUsers(state);
  const roles = useAllRoles(can("admin.roles"));
  const [sheet, setSheet] = useState<null | "new" | StaffUser>(null);
  const set = (patch: Partial<typeof state>) => setState({ ...patch, page: 1 });
  const roleName = (id: number | null) => {
    const role = roles.data?.find((r) => r.id === id);
    return role ? localizedField(role, "role_name", locale) : id === null ? "—" : `#${id}`;
  };

  const columns: Column<StaffUser>[] = [
    { id: "name", header: t("users.columns.name"), cell: (u) => <span className="font-medium">{u.name}</span> },
    { id: "email", header: t("users.columns.email"), cell: (u) => <span dir="ltr">{u.email}</span> },
    { id: "role", header: t("users.columns.role"), cell: (u) => roleName(u.role_id) },
    { id: "last", header: t("users.columns.lastActive"), cell: (u) => <span className="num text-muted-foreground">{u.last_active_at ? formatDateTime(u.last_active_at, locale) : t("users.never")}</span> },
    { id: "active", header: t("users.columns.active"), cell: (u) => <ActiveBadge value={u.active} /> },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FilterBar>
          {roles.data && (
            <FilterSelect
              label={t("users.filters.role")}
              value={state.role === null ? null : String(state.role)}
              onChange={(v) => set({ role: v === null ? null : Number(v) })}
              options={roles.data.map((r) => ({ value: String(r.id), label: localizedField(r, "role_name", locale) || `#${r.id}` }))}
            />
          )}
          <FilterSelect
            label={t("users.filters.active")}
            value={state.active}
            onChange={(v) => set({ active: v })}
            options={[
              { value: "1", label: t("common.active") },
              { value: "0", label: t("common.inactive") },
            ]}
          />
          <ResetFilters count={[state.role, state.active].filter((x) => x !== null).length} onReset={() => setState({ role: null, active: null, page: 1 })} />
        </FilterBar>
        <Button onClick={() => setSheet("new")}>
          <Plus data-icon="inline-start" />
          {t("users.new")}
        </Button>
      </div>
      <DataTable
        caption={t("users.title")}
        columns={columns}
        rows={list.data?.items}
        getRowId={(u) => u.id}
        getRowLabel={(u) => u.name}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        error={list.error}
        onRetry={() => list.refetch()}
        onRowClick={(u) => setSheet(u)}
        pagination={paginationProps(list.data?.meta, setState)}
        empty={<EmptyState compact title={t("users.empty")} />}
      />
      {sheet !== null && <UserSheet key={sheet === "new" ? "new" : sheet.id} user={sheet === "new" ? undefined : sheet} roles={roles.data} onClose={() => setSheet(null)} />}
    </>
  );
}
