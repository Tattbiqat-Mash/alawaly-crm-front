"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, RotateCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ConflictDialog } from "@/components/shared/conflict-dialog";
import { CheckboxField } from "@/components/shared/form/checkbox-field";
import { Field, fieldA11y, ReadOnlyField } from "@/components/shared/form/field";
import { applyServerErrors, notWritableFields } from "@/components/shared/form/server-errors";
import { FormError } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CONSTRUCTION_STATUSES } from "@/config/statuses";
import { usePermissions } from "@/features/auth/hooks";
import { templateLabel } from "@/features/catalog/components/floors-editor";
import { useLookup, useTemplateOptions } from "@/features/catalog/hooks";
import { useErrorMessage } from "@/hooks/use-error-message";
import { toApiError } from "@/lib/api/errors";
import { isOn, localizedName } from "@/lib/format/localized";
import { formatMoney } from "@/lib/format/money";
import { cn } from "@/lib/utils";
import { useUnit, useUpdateUnit } from "../hooks";
import type { LookupValue, Unit, UnitPatch, VersionedUnit } from "../types";
import { UnitStatusBadge } from "./unit-status-badge";
import { useInventoryLookups } from "./use-lookups";

const NONE = "none";

type Values = {
  unit_number: string;
  unit_code: string;
  floor_num: string;
  unit_deed_no: string;
  unit_template_id: string;
  unit_type_id: string;
  facade_id: string;
  finishing_type_id: string;
  construction_status: string;
  rooms: string;
  bathrooms: string;
  entrances: string;
  total_area: string;
  building_area: string;
  terrace_area: string;
  availabilty_date: string;
  display_order: string;
  is_featured: boolean;
  active: boolean;
  descriptionAr: string;
  descriptionEn: string;
  comments: string;
};
type FieldName = keyof Values;
const FIELDS: FieldName[] = [
  "unit_number",
  "unit_code",
  "floor_num",
  "unit_deed_no",
  "unit_template_id",
  "unit_type_id",
  "facade_id",
  "finishing_type_id",
  "construction_status",
  "rooms",
  "bathrooms",
  "entrances",
  "total_area",
  "building_area",
  "terrace_area",
  "availabilty_date",
  "display_order",
  "is_featured",
  "active",
  "descriptionAr",
  "descriptionEn",
  "comments",
];

const str = (v: string | number | null | undefined) => (v == null ? "" : String(v));
const idOrNone = (v: number | null | undefined) => (v == null ? NONE : String(v));

const toValues = (u: Unit): Values => ({
  unit_number: u.unit_number ?? "",
  unit_code: u.unit_code ?? "",
  floor_num: str(u.floor_num),
  unit_deed_no: u.unit_deed_no ?? "",
  unit_template_id: idOrNone(u.unit_template_id),
  unit_type_id: idOrNone(u.unit_type_id),
  facade_id: idOrNone(u.facade_id),
  finishing_type_id: idOrNone(u.finishing_type_id),
  construction_status: u.construction_status ?? NONE,
  rooms: str(u.rooms),
  bathrooms: str(u.bathrooms),
  entrances: str(u.entrances),
  total_area: u.total_area ?? "",
  building_area: u.building_area ?? "",
  terrace_area: u.terrace_area ?? "",
  availabilty_date: u.availabilty_date ? u.availabilty_date.slice(0, 10) : "",
  display_order: str(u.display_order),
  is_featured: isOn(u.is_featured),
  active: isOn(u.active),
  descriptionAr: u.descriptionAr ?? "",
  descriptionEn: u.descriptionEn ?? "",
  comments: u.comments ?? "",
});

const intOrNull = (v: string) => (v.trim() === "" ? null : Number.parseInt(v, 10));
const textOrNull = (v: string) => v.trim() || null;
const idOrNull = (v: string) => (v === NONE ? null : Number(v));

/** Every field as the API takes it. */
const toInput = (v: Values): Required<UnitPatch> => ({
  unit_number: textOrNull(v.unit_number),
  unit_code: textOrNull(v.unit_code),
  floor_num: intOrNull(v.floor_num),
  unit_deed_no: textOrNull(v.unit_deed_no),
  unit_template_id: idOrNull(v.unit_template_id),
  unit_type_id: idOrNull(v.unit_type_id),
  facade_id: idOrNull(v.facade_id),
  finishing_type_id: idOrNull(v.finishing_type_id),
  construction_status: v.construction_status === NONE ? null : v.construction_status,
  rooms: intOrNull(v.rooms),
  bathrooms: intOrNull(v.bathrooms),
  entrances: intOrNull(v.entrances),
  total_area: textOrNull(v.total_area),
  building_area: textOrNull(v.building_area),
  terrace_area: textOrNull(v.terrace_area),
  availabilty_date: v.availabilty_date || null,
  display_order: intOrNull(v.display_order),
  is_featured: v.is_featured,
  active: v.active,
  descriptionAr: textOrNull(v.descriptionAr),
  descriptionEn: textOrNull(v.descriptionEn),
  comments: textOrNull(v.comments),
});

/** Only changed fields are sent: smaller requests and fewer FIELD_NOT_WRITABLE surprises. */
function toPatch(values: Values, dirty: Partial<Record<FieldName, unknown>>): UnitPatch {
  const all = toInput(values);
  return Object.fromEntries(FIELDS.filter((f) => dirty[f]).map((f) => [f, all[f]]));
}

export function UnitDetailsForm({ data }: { data: VersionedUnit }) {
  const t = useTranslations();
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const { can } = usePermissions();
  const canEdit = can("inventory.edit");
  const lookups = useInventoryLookups();
  const templates = useTemplateOptions();
  const facades = useLookup("facade");
  const finishing = useLookup("finishing");
  const lookupOptions = (items: LookupValue[] | undefined) =>
    (items ?? []).map((v) => ({ value: String(v.id), label: localizedName(v, locale) || v.crm_id || `#${v.id}` }));
  const unitQuery = useUnit(data.unit.id);
  const update = useUpdateUnit(data.unit.id);

  // The version the user started editing from. Saves send its ETag, never a newer one that
  // arrived in the background, so concurrent edits always surface as a conflict.
  const baseline = useRef<VersionedUnit>(data);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [changedFields, setChangedFields] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const whole = z.string().regex(/^\d*$/, t("units.form.wholeNumber"));
  const decimal = z.string().regex(/^(\d+(\.\d{1,3})?)?$/, t("units.form.decimal"));
  const schema = z.object({
    unit_number: z.string().trim().max(50),
    unit_code: z.string().trim().max(30),
    floor_num: z.string().regex(/^-?\d*$/, t("units.form.wholeNumber")),
    unit_deed_no: z.string().trim().max(100),
    unit_template_id: z.string(),
    unit_type_id: z.string(),
    facade_id: z.string(),
    finishing_type_id: z.string(),
    construction_status: z.string(),
    rooms: whole,
    bathrooms: whole,
    entrances: whole,
    total_area: decimal,
    building_area: decimal,
    terrace_area: decimal,
    availabilty_date: z.string(),
    display_order: whole,
    is_featured: z.boolean(),
    active: z.boolean(),
    descriptionAr: z.string().max(5000),
    descriptionEn: z.string().max(5000),
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
    unit_number: t("units.form.number"),
    unit_code: t("units.form.code"),
    floor_num: t("units.form.floor"),
    unit_deed_no: t("units.form.deed"),
    unit_template_id: t("units.form.template"),
    unit_type_id: t("units.form.type"),
    facade_id: t("units.form.facade"),
    finishing_type_id: t("units.form.finishing"),
    construction_status: t("units.form.constructionStatus"),
    rooms: t("units.form.rooms"),
    bathrooms: t("units.form.bathrooms"),
    entrances: t("units.form.entrances"),
    total_area: t("units.form.area"),
    building_area: t("units.form.buildingArea"),
    terrace_area: t("units.form.terraceArea"),
    availabilty_date: t("units.form.availabilityDate"),
    display_order: t("units.form.displayOrder"),
    is_featured: t("units.form.featured"),
    active: t("units.form.active"),
    descriptionAr: t("units.form.descriptionAr"),
    descriptionEn: t("units.form.descriptionEn"),
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
  const text = (f: FieldName, opts: { inputMode?: "numeric" | "decimal"; type?: string; mono?: boolean } = {}) => (
    <Field id={f} label={labels[f]} error={err(f)}>
      <Input
        {...fieldA11y(f, err(f))}
        className={cn("h-9 shadow-2xs", opts.inputMode && "num", opts.mono && "font-mono")}
        inputMode={opts.inputMode}
        type={opts.type}
        dir="ltr"
        {...form.register(f)}
      />
    </Field>
  );
  const select = (f: FieldName, options: { value: string; label: string }[]) => (
    <Field id={f} label={labels[f]} error={err(f)}>
      <Controller
        control={form.control}
        name={f}
        render={({ field }) => (
          <Select value={String(field.value)} onValueChange={field.onChange} disabled={!canEdit}>
            <SelectTrigger {...fieldA11y(f, err(f))} className="h-9 w-full shadow-2xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>—</SelectItem>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
              {/* Keep a stored value the lists do not (yet) contain. */}
              {field.value !== NONE && !options.some((o) => o.value === field.value) && (
                <SelectItem value={String(field.value)}>#{String(field.value)}</SelectItem>
              )}
            </SelectContent>
          </Select>
        )}
      />
    </Field>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      <div className="grid gap-3 rounded-xl border bg-muted/20 p-4 shadow-2xs sm:grid-cols-2 lg:grid-cols-4">
        <ReadOnlyField label={t("units.form.status")} value={<UnitStatusBadge status={unit.status} />} />
        <ReadOnlyField label={t("units.form.priceInTax")} value={<span className="num font-bold text-foreground">{formatMoney(unit.price_in_tax, locale)}</span>} />
        <ReadOnlyField label={t("units.form.reservationFee")} value={<span className="num font-semibold text-foreground">{formatMoney(unit.reservation_amount, locale)}</span>} />
        <ReadOnlyField label={t("units.form.version")} value={<span className="num font-mono text-muted-foreground">v{unit.version}</span>} />
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">{t("units.form.readOnlyHint")}</p>

      {changedFields.length > 0 && (
        <p role="status" className="rounded-lg border border-info/25 bg-info/10 px-3.5 py-2.5 text-sm text-info">
          {t("errors.conflict.changed")} {new Intl.ListFormat(locale, { type: "conjunction" }).format(changedFields)}
        </p>
      )}

      <fieldset disabled={!canEdit || update.isPending} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {text("unit_number")}
        {text("unit_code", { mono: true })}
        {text("floor_num", { inputMode: "numeric" })}
        {text("unit_deed_no")}
        {select("unit_template_id", (templates.data ?? []).map((tpl) => ({ value: String(tpl.id), label: templateLabel(tpl, locale) })))}
        {select("unit_type_id", lookups.unitTypes.map((u) => ({ value: String(u.id), label: localizedName(u, locale) || `#${u.id}` })))}
        {select("facade_id", lookupOptions(facades.data?.items))}
        {select("finishing_type_id", lookupOptions(finishing.data?.items))}
        {select("construction_status", CONSTRUCTION_STATUSES.map((s) => ({ value: s, label: t(`statuses.construction.${s}`) })))}
        {text("rooms", { inputMode: "numeric" })}
        {text("bathrooms", { inputMode: "numeric" })}
        {text("entrances", { inputMode: "numeric" })}
        {text("total_area", { inputMode: "decimal" })}
        {text("building_area", { inputMode: "decimal" })}
        {text("terrace_area", { inputMode: "decimal" })}
        {text("availabilty_date", { type: "date" })}
        {text("display_order", { inputMode: "numeric" })}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-border/70 bg-card p-3 shadow-2xs">
          <CheckboxField control={form.control} name="active" label={labels.active} disabled={!canEdit} />
          <CheckboxField control={form.control} name="is_featured" label={labels.is_featured} disabled={!canEdit} />
          {(err("active") || err("is_featured")) && <span className="text-xs text-destructive">{err("active") ?? err("is_featured")}</span>}
        </div>
        <Field id="descriptionAr" label={labels.descriptionAr} error={err("descriptionAr")} className="sm:col-span-2 lg:col-span-3">
          <Textarea {...fieldA11y("descriptionAr", err("descriptionAr"))} rows={2} dir="rtl" className="shadow-2xs leading-relaxed" {...form.register("descriptionAr")} />
        </Field>
        <Field id="descriptionEn" label={labels.descriptionEn} error={err("descriptionEn")} className="sm:col-span-2 lg:col-span-3">
          <Textarea {...fieldA11y("descriptionEn", err("descriptionEn"))} rows={2} dir="ltr" className="shadow-2xs leading-relaxed" {...form.register("descriptionEn")} />
        </Field>
        <Field id="comments" label={labels.comments} error={err("comments")} className="sm:col-span-2 lg:col-span-3">
          <Textarea {...fieldA11y("comments", err("comments"))} rows={3} className="shadow-2xs leading-relaxed" {...form.register("comments")} />
        </Field>
      </fieldset>

      <FormError>{formError}</FormError>

      {canEdit && (
        <div className="flex items-center justify-end gap-2.5 border-t pt-4">
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
