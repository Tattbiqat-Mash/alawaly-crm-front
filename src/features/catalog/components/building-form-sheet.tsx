"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { CheckboxField } from "@/components/shared/form/checkbox-field";
import { Field, fieldA11y } from "@/components/shared/form/field";
import { FormSheet } from "@/components/shared/form/form-sheet";
import { applyServerErrors } from "@/components/shared/form/server-errors";
import { FormError } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProjects } from "@/features/inventory/hooks";
import type { Building } from "@/features/inventory/types";
import { useErrorMessage } from "@/hooks/use-error-message";
import { toApiError } from "@/lib/api/errors";
import { useIdempotencyKey } from "@/lib/api/idempotency";
import { isOn, localizedName } from "@/lib/format/localized";
import type { BuildingInput } from "../api";
import { useSaveBuilding } from "../hooks";

type Values = { project_id: string; building_code: string; floors_count: string; addressAr: string; addressEn: string; active: boolean };

const toValues = (b?: Building, defaultProject?: string | null): Values => ({
  project_id: b?.project_id != null ? String(b.project_id) : (defaultProject ?? ""),
  building_code: b?.building_code ?? "",
  floors_count: b?.floors_count == null ? "" : String(b.floors_count),
  addressAr: b?.addressAr ?? "",
  addressEn: b?.addressEn ?? "",
  active: b ? isOn(b.active) : true,
});

/** S09 create/edit. `building` undefined = new building (prefilled with the filtered project). */
export function BuildingFormSheet({
  building,
  defaultProject,
  canEdit,
  onClose,
}: {
  building?: Building;
  defaultProject: string | null;
  canEdit: boolean;
  onClose: () => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const projects = useProjects();
  const save = useSaveBuilding();
  const idempotency = useIdempotencyKey();
  const [formError, setFormError] = useState<string | null>(null);
  const isNew = !building;

  const schema = z.object({
    project_id: z.string().min(1, t("buildings.projectRequired")),
    building_code: z.string().trim().min(1, t("validation.required")).max(50),
    floors_count: z.string().trim().regex(/^\d*$/, t("validation.wholeNumber")),
    addressAr: z.string().trim().max(255),
    addressEn: z.string().trim().max(255),
    active: z.boolean(),
  });
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(building, defaultProject) });
  const { errors, dirtyFields, isDirty } = form.formState;
  const err = (k: keyof Values) => errors[k]?.message;

  const onSubmit = form.handleSubmit((v) => {
    setFormError(null);
    const all: BuildingInput = {
      project_id: Number(v.project_id),
      building_code: v.building_code.trim(),
      floors_count: v.floors_count === "" ? null : Number.parseInt(v.floors_count, 10),
      addressAr: v.addressAr.trim() || null,
      addressEn: v.addressEn.trim() || null,
      active: v.active,
    };
    const body = isNew
      ? Object.fromEntries(Object.entries(all).filter(([, value]) => value !== null))
      : Object.fromEntries(Object.entries(all).filter(([k]) => dirtyFields[k as keyof Values]));
    save.mutate(
      { id: building?.id ?? null, body, idempotencyKey: idempotency.key },
      {
        onSuccess: () => {
          idempotency.renew();
          toast.success(isNew ? t("buildings.created") : t("buildings.saved"));
          onClose();
        },
        onError: (e) => {
          if (toApiError(e).code === "IDEMPOTENCY_CONFLICT") idempotency.renew();
          if (!applyServerErrors(e, form.setError, Object.keys(all) as (keyof Values)[])) setFormError(errorMessage(e));
        },
      },
    );
  });

  return (
    <FormSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={isNew ? t("buildings.new") : t("buildings.editTitle")}
      onSubmit={onSubmit}
      footer={
        <>
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
      <p className="flex gap-2 rounded-lg border border-info/25 bg-info/5 p-3 text-xs text-info">
        <Info aria-hidden className="size-4 shrink-0" />
        {t("common.crmOverwrite")}
      </p>
      <fieldset disabled={!canEdit || save.isPending} className="grid gap-4">
        <Field id="b-project" label={t("buildings.fields.project")} required error={err("project_id")}>
          <Controller
            control={form.control}
            name="project_id"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={!canEdit}>
                <SelectTrigger {...fieldA11y("b-project", err("project_id"))} className="w-full">
                  <SelectValue placeholder={t("buildings.fields.project")} />
                </SelectTrigger>
                <SelectContent>
                  {(projects.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {localizedName(p, locale) || `#${p.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="b-code" label={t("buildings.fields.code")} required error={err("building_code")}>
            <Input {...fieldA11y("b-code", err("building_code"))} dir="ltr" {...form.register("building_code")} />
          </Field>
          <Field id="b-floors" label={t("buildings.fields.floors")} error={err("floors_count")}>
            <Input {...fieldA11y("b-floors", err("floors_count"))} inputMode="numeric" dir="ltr" {...form.register("floors_count")} />
          </Field>
        </div>
        <Field id="b-addressAr" label={t("buildings.fields.addressAr")} error={err("addressAr")}>
          <Input {...fieldA11y("b-addressAr", err("addressAr"))} dir="rtl" {...form.register("addressAr")} />
        </Field>
        <Field id="b-addressEn" label={t("buildings.fields.addressEn")} error={err("addressEn")}>
          <Input {...fieldA11y("b-addressEn", err("addressEn"))} dir="ltr" {...form.register("addressEn")} />
        </Field>
        <CheckboxField control={form.control} name="active" label={t("buildings.fields.active")} disabled={!canEdit} />
      </fieldset>
      <FormError>{formError}</FormError>
    </FormSheet>
  );
}
