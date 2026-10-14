"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Loader2, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { CheckboxField } from "@/components/shared/form/checkbox-field";
import { Field, fieldA11y } from "@/components/shared/form/field";
import { FormSheet } from "@/components/shared/form/form-sheet";
import { applyServerErrors } from "@/components/shared/form/server-errors";
import { MediaListInput } from "@/components/shared/media-list-input";
import { ErrorState, FormError } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { AddUnitDialog } from "@/features/inventory/components/add-unit-dialog";
import { useInventoryLookups } from "@/features/inventory/components/use-lookups";
import type { Feature, UnitMedia, UnitTemplateDetail } from "@/features/inventory/types";
import { useErrorMessage } from "@/hooks/use-error-message";
import { isOn, localizedName } from "@/lib/format/localized";
import type { UnitTemplateInput } from "../api";
import { useSaveUnitTemplate, useUnitTemplate, useUnitTemplateFeatures } from "../hooks";
import { FeaturePicker } from "./feature-picker";

const NONE = "none";

/** JSON fields arrive as JSON text (or already decoded); anything unreadable counts as empty. */
function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null || value === "") return fallback;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

type Values = {
  style_code: string;
  nameAr: string;
  nameEn: string;
  unit_type_id: string;
  bedrooms: string;
  bathrooms: string;
  entrances: string;
  area_m2: string;
  building_area: string;
  terrace_area: string;
  price_ex_tax: string;
  price_in_tax: string;
  descriptionAr: string;
  descriptionEn: string;
  /** One path or URL per line. */
  images: string[];
  plans: string[];
  features: number[];
  active: boolean;
};
type FieldName = keyof Values;

const str = (v: string | number | null | undefined) => (v == null ? "" : String(v));

function toValues(tpl?: UnitTemplateDetail, features?: Feature[]): Values {
  const media = parseJson<UnitMedia>(tpl?.unit_media, {});
  return {
    style_code: tpl?.style_code ?? "",
    nameAr: tpl?.nameAr ?? "",
    nameEn: tpl?.nameEn ?? "",
    unit_type_id: tpl?.unit_type_id != null ? String(tpl.unit_type_id) : NONE,
    bedrooms: str(tpl?.bedrooms),
    bathrooms: str(tpl?.bathrooms),
    entrances: str(tpl?.entrances),
    area_m2: str(tpl?.area_m2),
    building_area: str(tpl?.building_area),
    terrace_area: str(tpl?.terrace_area),
    price_ex_tax: str(tpl?.price_ex_tax),
    price_in_tax: str(tpl?.price_in_tax),
    descriptionAr: tpl?.descriptionAr ?? "",
    descriptionEn: tpl?.descriptionEn ?? "",
    images: media.unit_image ?? [],
    plans: media.unit_plan ?? [],
    features: features ? features.map((f) => f.id) : parseJson<number[]>(tpl?.features, []),
    active: tpl ? isOn(tpl.active) : true,
  };
}

const num = (v: string) => (v.trim() === "" ? null : Number(v));

/** Field → body keys it sends (images and plans travel together as unit_media). */
function toInput(v: Values): Omit<Required<UnitTemplateInput>, "features"> {
  return {
    style_code: v.style_code.trim(),
    nameAr: v.nameAr.trim() || null,
    nameEn: v.nameEn.trim() || null,
    unit_type_id: v.unit_type_id === NONE ? null : Number(v.unit_type_id),
    bedrooms: num(v.bedrooms),
    bathrooms: num(v.bathrooms),
    entrances: num(v.entrances),
    area_m2: num(v.area_m2),
    building_area: num(v.building_area),
    terrace_area: num(v.terrace_area),
    price_ex_tax: num(v.price_ex_tax),
    price_in_tax: num(v.price_in_tax),
    descriptionAr: v.descriptionAr.trim() || null,
    descriptionEn: v.descriptionEn.trim() || null,
    unit_media: { unit_image: v.images, unit_plan: v.plans },
    active: v.active,
  };
}

/** S25 create/edit a unit template. `templateId` null = new template. */
export function UnitTemplateFormSheet({ templateId, canEdit, onClose }: { templateId: number | null; canEdit: boolean; onClose: () => void }) {
  const t = useTranslations();
  const query = useUnitTemplate(templateId);
  const features = useUnitTemplateFeatures(templateId);
  // The features read is a convenience: if it fails, the template row's own `features` JSON is used.
  const error = query.error;
  if (templateId !== null && !(query.data && (features.data || features.error))) {
    return (
      <FormSheet
        open
        onOpenChange={(o) => !o && onClose()}
        title={t("unitTemplates.editTitle")}
        onSubmit={(e) => e.preventDefault()}
        footer={
          <Button type="button" variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
        }
      >
        {error ? (
          <ErrorState
            compact
            error={error}
            onRetry={() => {
              query.refetch();
            }}
          />
        ) : (
          <div className="space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-2/3" />
          </div>
        )}
      </FormSheet>
    );
  }
  return <TemplateForm template={query.data} features={features.data} templateId={templateId} canEdit={canEdit} onClose={onClose} />;
}

function TemplateForm({
  template,
  features,
  templateId,
  canEdit,
  onClose,
}: {
  template?: UnitTemplateDetail;
  features?: Feature[];
  templateId: number | null;
  canEdit: boolean;
  onClose: () => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const lookups = useInventoryLookups();
  const save = useSaveUnitTemplate();
  const [formError, setFormError] = useState<string | null>(null);
  const [addingUnit, setAddingUnit] = useState(false);
  const isNew = templateId === null;

  const whole = z.string().trim().regex(/^\d*$/, t("validation.wholeNumber"));
  const decimal = z.string().trim().regex(/^(\d+(\.\d{1,3})?)?$/, t("units.form.decimal"));
  const money = z.string().trim().regex(/^(\d+(\.\d{1,2})?)?$/, t("unitTemplates.moneyInvalid"));
  const schema = z.object({
    style_code: z.string().trim().min(1, t("validation.required")).max(30),
    nameAr: z.string().trim().max(255),
    nameEn: z.string().trim().max(255),
    unit_type_id: z.string(),
    bedrooms: whole,
    bathrooms: whole,
    entrances: whole,
    area_m2: decimal,
    building_area: decimal,
    terrace_area: decimal,
    price_ex_tax: money,
    price_in_tax: money,
    descriptionAr: z.string().max(5000),
    descriptionEn: z.string().max(5000),
    images: z.array(z.string()),
    plans: z.array(z.string()),
    features: z.array(z.number()),
    active: z.boolean(),
  });
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(template, features) });
  const { errors, isDirty } = form.formState;
  const err = (k: FieldName) => errors[k]?.message;
  const input = (name: FieldName, label: string, opts: { dir?: "ltr" | "rtl"; inputMode?: "numeric" | "decimal"; required?: boolean; description?: ReactNode } = {}) => (
    <Field id={`ut-${name}`} label={label} required={opts.required} error={err(name)} description={opts.description}>
      <Input {...fieldA11y(`ut-${name}`, err(name), opts.description)} dir={opts.dir ?? "ltr"} inputMode={opts.inputMode} {...form.register(name)} />
    </Field>
  );

  const onSubmit = form.handleSubmit((v) => {
    setFormError(null);
    const all = toInput(v);
    let body: UnitTemplateInput;
    if (isNew) {
      body = Object.fromEntries(Object.entries(all).filter(([, value]) => value !== null && value !== ""));
      if (v.features.length) body.features = v.features;
    } else {
      const dirty = (f: FieldName) => form.getFieldState(f).isDirty;
      body = Object.fromEntries(
        Object.entries(all).filter(([k]) => (k === "unit_media" ? dirty("images") || dirty("plans") : dirty(k as FieldName))),
      );
    }
    const featureIds = !isNew && form.getFieldState("features").isDirty ? v.features : null;
    save.mutate(
      { id: templateId, body, featureIds },
      {
        onSuccess: ({ meta }) => {
          if (isNew) toast.success(t("unitTemplates.created"));
          else toast.success(t("unitTemplates.saved", { count: meta?.units_updated ?? 0 }));
          if (meta?.prices_not_propagated.length) toast.info(t("unitTemplates.pricesNotPropagated"), { duration: 10_000 });
          onClose();
        },
        onError: (e) => {
          if (!applyServerErrors(e, form.setError, Object.keys(all) as FieldName[])) setFormError(errorMessage(e));
        },
      },
    );
  });

  return (
    <>
      <FormSheet
        open={!addingUnit}
        wide
        onOpenChange={(o) => !o && onClose()}
        title={isNew ? t("unitTemplates.new") : t("unitTemplates.editTitle")}
        description={!isNew && template ? t("unitTemplates.linkedUnits", { count: template.units_count ?? 0 }) : undefined}
        onSubmit={onSubmit}
        footer={
          <>
            {!isNew && canEdit && (
              <Button type="button" variant="outline" className="me-auto" onClick={() => setAddingUnit(true)} disabled={isDirty}>
                <Plus data-icon="inline-start" />
                {t("unitTemplates.addUnit")}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            {canEdit && (
              <Button type="submit" disabled={save.isPending || (!isNew && !isDirty)}>
                {save.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
                {isNew ? t("common.create") : t("common.save")}
              </Button>
            )}
          </>
        }
      >
        {!isNew && (
          <p className="flex gap-2 rounded-lg border border-info/25 bg-info/5 p-3 text-xs text-info">
            <Info aria-hidden className="size-4 shrink-0" />
            {t("unitTemplates.propagationHint")}
          </p>
        )}
        <fieldset disabled={!canEdit || save.isPending} className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {input("style_code", t("unitTemplates.fields.code"), { required: true })}
            <Field id="ut-unit_type_id" label={t("unitTemplates.fields.type")} error={err("unit_type_id")}>
              <Controller
                control={form.control}
                name="unit_type_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={!canEdit}>
                    <SelectTrigger {...fieldA11y("ut-unit_type_id", err("unit_type_id"))} className="w-full">
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
            {input("nameAr", t("common.nameAr"), { dir: "rtl" })}
            {input("nameEn", t("common.nameEn"))}
          </div>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {input("bedrooms", t("unitTemplates.fields.bedrooms"), { inputMode: "numeric" })}
            {input("bathrooms", t("unitTemplates.fields.bathrooms"), { inputMode: "numeric" })}
            {input("entrances", t("unitTemplates.fields.entrances"), { inputMode: "numeric" })}
            {input("area_m2", t("unitTemplates.fields.area"), { inputMode: "decimal" })}
            {input("building_area", t("unitTemplates.fields.buildingArea"), { inputMode: "decimal" })}
            {input("terrace_area", t("unitTemplates.fields.terraceArea"), { inputMode: "decimal" })}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {input("price_ex_tax", t("unitTemplates.fields.priceExTax"), { inputMode: "decimal" })}
            {input("price_in_tax", t("unitTemplates.fields.priceInTax"), { inputMode: "decimal", description: !isNew ? t("unitTemplates.priceHint") : undefined })}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="ut-descriptionAr" label={t("unitTemplates.fields.descriptionAr")} error={err("descriptionAr")}>
              <Textarea {...fieldA11y("ut-descriptionAr", err("descriptionAr"))} dir="rtl" rows={3} {...form.register("descriptionAr")} />
            </Field>
            <Field id="ut-descriptionEn" label={t("unitTemplates.fields.descriptionEn")} error={err("descriptionEn")}>
              <Textarea {...fieldA11y("ut-descriptionEn", err("descriptionEn"))} dir="ltr" rows={3} {...form.register("descriptionEn")} />
            </Field>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {(["images", "plans"] as const).map((name) => (
              <Field key={name} id={`ut-${name}`} label={t(`unitTemplates.fields.${name}`)} error={err(name)}>
                <Controller
                  control={form.control}
                  name={name}
                  render={({ field }) => <MediaListInput id={`ut-${name}`} value={field.value} onChange={field.onChange} disabled={!canEdit} />}
                />
              </Field>
            ))}
          </div>
          <Field id="ut-features" label={t("unitTemplates.fields.features")} error={err("features")}>
            <Controller
              control={form.control}
              name="features"
              render={({ field }) => <FeaturePicker id="ut-features" type="unit" value={field.value} onChange={field.onChange} known={features} disabled={!canEdit} />}
            />
          </Field>
          <CheckboxField control={form.control} name="active" label={t("unitTemplates.fields.active")} disabled={!canEdit} />
        </fieldset>
        <FormError>{formError}</FormError>
      </FormSheet>
      {templateId !== null && (
        <AddUnitDialog open={addingUnit} onOpenChange={(o) => !o && setAddingUnit(false)} preset={{ templateId }} />
      )}
    </>
  );
}
