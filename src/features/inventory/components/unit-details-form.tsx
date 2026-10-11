"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, RotateCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ConflictDialog } from "@/components/shared/conflict-dialog";
import { Field, fieldA11y, ReadOnlyField } from "@/components/shared/form/field";
import { applyServerErrors, notWritableFields } from "@/components/shared/form/server-errors";
import { FormError } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CONSTRUCTION_STATUSES } from "@/config/statuses";
import { usePermissions } from "@/features/auth/hooks";
import { useErrorMessage } from "@/hooks/use-error-message";
import { toApiError } from "@/lib/api/errors";
import { isOn, localizedName } from "@/lib/format/localized";
import { formatMoney } from "@/lib/format/money";
import { useUnit, useUpdateUnit } from "../hooks";
import type { Unit, UnitPatch, VersionedUnit } from "../types";
import { UnitStatusBadge } from "./unit-status-badge";
import { useInventoryLookups } from "./use-lookups";

const NONE = "none";

type Values = {
  unit_type_id: string;
  rooms: string;
  bathrooms: string;
  total_area: string;
  construction_status: string;
  display_order: string;
  active: boolean;
  comments: string;
};
type FieldName = keyof Values;
const FIELDS: FieldName[] = ["unit_type_id", "rooms", "bathrooms", "total_area", "construction_status", "display_order", "active", "comments"];

const toValues = (u: Unit): Values => ({
  unit_type_id: u.unit_type_id === null ? NONE : String(u.unit_type_id),
  rooms: u.rooms === null ? "" : String(u.rooms),
  bathrooms: u.bathrooms === null ? "" : String(u.bathrooms),
  total_area: u.total_area ?? "",
  construction_status: u.construction_status ?? NONE,
  display_order: u.display_order === null ? "" : String(u.display_order),
  active: isOn(u.active),
  comments: u.comments ?? "",
});

const intOrNull = (v: string) => (v.trim() === "" ? null : Number.parseInt(v, 10));

/** Only changed fields are sent: smaller requests and fewer FIELD_NOT_WRITABLE surprises. */
function toPatch(values: Values, dirty: Partial<Record<FieldName, unknown>>): UnitPatch {
  const patch: UnitPatch = {};
  if (dirty.unit_type_id) patch.unit_type_id = values.unit_type_id === NONE ? null : Number(values.unit_type_id);
  if (dirty.rooms) patch.rooms = intOrNull(values.rooms);
  if (dirty.bathrooms) patch.bathrooms = intOrNull(values.bathrooms);
  if (dirty.total_area) patch.total_area = values.total_area.trim() || null;
  if (dirty.construction_status) patch.construction_status = values.construction_status === NONE ? null : values.construction_status;
  if (dirty.display_order) patch.display_order = intOrNull(values.display_order);
  if (dirty.active) patch.active = values.active;
  if (dirty.comments) patch.comments = values.comments.trim() || null;
  return patch;
}

export function UnitDetailsForm({ data }: { data: VersionedUnit }) {
  const t = useTranslations();
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const { can } = usePermissions();
  const canEdit = can("inventory.edit");
  const lookups = useInventoryLookups();
  const unitQuery = useUnit(data.unit.id);
  const update = useUpdateUnit(data.unit.id);

  // The version the user started editing from. Saves send its ETag, never a newer one that
  // arrived in the background, so concurrent edits always surface as a conflict.
  const baseline = useRef<VersionedUnit>(data);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [changedFields, setChangedFields] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const schema = z.object({
    unit_type_id: z.string(),
    rooms: z.string().regex(/^\d*$/, t("units.form.wholeNumber")),
    bathrooms: z.string().regex(/^\d*$/, t("units.form.wholeNumber")),
    total_area: z.string().regex(/^(\d+(\.\d{1,3})?)?$/, t("units.form.decimal")),
    construction_status: z.string(),
    display_order: z.string().regex(/^\d*$/, t("units.form.wholeNumber")),
    active: z.boolean(),
    comments: z.string().max(2000),
  });

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(data.unit) });
  const { errors, isDirty, dirtyFields } = form.formState;

  // Fresh server data (e.g. after a status change) flows in while the form is untouched.
  useEffect(() => {
    if (!isDirty && data.etag !== baseline.current.etag) {
      baseline.current = data;
      form.reset(toValues(data.unit));
    }
  }, [data, isDirty, form]);

  const labels: Record<FieldName, string> = {
    unit_type_id: t("units.form.type"),
    rooms: t("units.form.rooms"),
    bathrooms: t("units.form.bathrooms"),
    total_area: t("units.form.area"),
    construction_status: t("units.form.constructionStatus"),
    display_order: t("units.form.displayOrder"),
    active: t("units.form.active"),
    comments: t("units.form.comments"),
  };

  const submitValues = (values: Values) => {
    setFormError(null);
    const patch = toPatch(values, dirtyFields);
    if (Object.keys(patch).length === 0) return setFormError(t("units.form.noChanges"));

    update.mutate(
      { patch, etag: baseline.current.etag },
      {
        onSuccess: (next) => {
          baseline.current = next;
          form.reset(toValues(next.unit));
          toast.success(t("units.form.saved"));
        },
        onError: (error) => {
          const e = toApiError(error);
          if (e.isConflict) return setConflictOpen(true);
          if (e.code === "FIELD_NOT_WRITABLE") {
            const fields = notWritableFields(e).filter((f): f is FieldName => FIELDS.includes(f as FieldName));
            fields.forEach((f) => form.setError(f, { type: "server", message: t("units.form.notWritable") }));
            if (fields.length) return;
          }
          if (applyServerErrors(e, form.setError, FIELDS)) return;
          setFormError(errorMessage(e));
        },
      },
    );
  };
  // handleSubmit runs in the submit event (the baseline ref is read there, never during render).
  const onSubmit = (e: FormEvent<HTMLFormElement>) => form.handleSubmit(submitValues)(e);

  /** Reload the latest version, keep the user's own edits, and show what changed underneath. */
  const reloadLatest = async () => {
    const result = await unitQuery.refetch();
    const latest = result.data;
    if (!latest) return;
    const before = toValues(baseline.current.unit);
    const after = toValues(latest.unit);
    const changed = FIELDS.filter((f) => before[f] !== after[f]).map((f) => labels[f]);
    if (baseline.current.unit.status !== latest.unit.status) changed.push(t("units.form.status"));
    if (baseline.current.unit.price_in_tax !== latest.unit.price_in_tax) changed.push(t("units.form.priceInTax"));
    setChangedFields(changed);
    baseline.current = latest;
    form.reset(after, { keepDirtyValues: true });
    setConflictOpen(false);
  };

  const unit = data.unit;
  const err = (f: FieldName) => errors[f]?.message;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ReadOnlyField label={t("units.form.status")} value={<UnitStatusBadge status={unit.status} />} />
        <ReadOnlyField label={t("units.form.priceInTax")} value={<span className="num">{formatMoney(unit.price_in_tax, locale)}</span>} />
        <ReadOnlyField label={t("units.form.reservationFee")} value={<span className="num">{formatMoney(unit.reservation_amount, locale)}</span>} />
        <ReadOnlyField label={t("units.form.version")} value={<span className="num">{unit.version}</span>} />
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">{t("units.form.readOnlyHint")}</p>

      {changedFields.length > 0 && (
        <p role="status" className="rounded-lg border border-info/25 bg-info/10 px-3 py-2 text-sm text-info">
          {t("errors.conflict.changed")} {new Intl.ListFormat(locale, { type: "conjunction" }).format(changedFields)}
        </p>
      )}

      <fieldset disabled={!canEdit || update.isPending} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field id="unit_type_id" label={labels.unit_type_id} error={err("unit_type_id")}>
          <Controller
            control={form.control}
            name="unit_type_id"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={!canEdit}>
                <SelectTrigger {...fieldA11y("unit_type_id", err("unit_type_id"))} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {lookups.unitTypes.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {localizedName(u, locale) || `#${u.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field id="construction_status" label={labels.construction_status} error={err("construction_status")}>
          <Controller
            control={form.control}
            name="construction_status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={!canEdit}>
                <SelectTrigger {...fieldA11y("construction_status", err("construction_status"))} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {CONSTRUCTION_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`statuses.construction.${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field id="total_area" label={labels.total_area} error={err("total_area")}>
          <Input {...fieldA11y("total_area", err("total_area"))} inputMode="decimal" dir="ltr" {...form.register("total_area")} />
        </Field>
        <Field id="rooms" label={labels.rooms} error={err("rooms")}>
          <Input {...fieldA11y("rooms", err("rooms"))} inputMode="numeric" dir="ltr" {...form.register("rooms")} />
        </Field>
        <Field id="bathrooms" label={labels.bathrooms} error={err("bathrooms")}>
          <Input {...fieldA11y("bathrooms", err("bathrooms"))} inputMode="numeric" dir="ltr" {...form.register("bathrooms")} />
        </Field>
        <Field id="display_order" label={labels.display_order} error={err("display_order")}>
          <Input {...fieldA11y("display_order", err("display_order"))} inputMode="numeric" dir="ltr" {...form.register("display_order")} />
        </Field>
        <Field id="comments" label={labels.comments} error={err("comments")} className="sm:col-span-2 lg:col-span-3">
          <Textarea {...fieldA11y("comments", err("comments"))} rows={3} {...form.register("comments")} />
        </Field>
        <div className="flex items-center gap-2">
          <Controller
            control={form.control}
            name="active"
            render={({ field }) => (
              <Checkbox id="active" checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} disabled={!canEdit} />
            )}
          />
          <Label htmlFor="active">{labels.active}</Label>
          {err("active") && <span className="text-xs text-destructive">{err("active")}</span>}
        </div>
      </fieldset>

      <FormError>{formError}</FormError>

      {canEdit && (
        <div className="flex items-center justify-end gap-2 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setFormError(null);
              setChangedFields([]);
              form.reset(toValues(baseline.current.unit));
            }}
            disabled={!isDirty || update.isPending}
          >
            <RotateCcw data-icon="inline-start" />
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={!isDirty || update.isPending}>
            {update.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
            {update.isPending ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      )}

      <ConflictDialog
        open={conflictOpen}
        onOpenChange={setConflictOpen}
        reloading={unitQuery.isFetching}
        onReload={reloadLatest}
      />
    </form>
  );
}
