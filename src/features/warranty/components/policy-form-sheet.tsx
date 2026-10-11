"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Loader2, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import type { WarrantyPolicy } from "@/features/sales/types";
import { useErrorMessage } from "@/hooks/use-error-message";
import { toApiError } from "@/lib/api/errors";
import { useIdempotencyKey } from "@/lib/api/idempotency";
import { isOn } from "@/lib/format/localized";
import { WARRANTY_CATEGORIES, type PolicyInput } from "../api";
import { useSavePolicy } from "../hooks";

type Transfer = "yes" | "no" | "undecided";
type Values = { category: string; name_ar: string; name_en: string; months: string; transferable: Transfer; terms_ar: string; terms_en: string; active: boolean };

const toTransfer = (v: WarrantyPolicy["transferable"] | undefined): Transfer => (v === null || v === undefined ? "undecided" : isOn(v) ? "yes" : "no");
const fromTransfer = (v: Transfer) => (v === "undecided" ? null : v === "yes");

/** S23 create/edit a warranty policy. The duration of an existing policy is locked. */
export function PolicyFormSheet({ policy, onClose }: { policy?: WarrantyPolicy; onClose: () => void }) {
  const t = useTranslations();
  const errorMessage = useErrorMessage();
  const save = useSavePolicy();
  const idempotency = useIdempotencyKey();
  const [formError, setFormError] = useState<string | null>(null);
  const isNew = !policy;

  const required = t("validation.required");
  const schema = z.object({
    category: z.string().min(1, required),
    name_ar: z.string().trim().min(1, required),
    name_en: z.string().trim().min(1, required),
    months: z.string().refine((v) => !isNew || (/^\d+$/.test(v) && Number(v) >= 1), t("warranty.monthsInvalid")),
    transferable: z.enum(["yes", "no", "undecided"]),
    terms_ar: z.string(),
    terms_en: z.string(),
    active: z.boolean(),
  });
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: policy?.category ?? "structural",
      name_ar: policy?.name_ar ?? "",
      name_en: policy?.name_en ?? "",
      months: policy?.months == null ? "" : String(policy.months),
      transferable: toTransfer(policy?.transferable),
      terms_ar: policy?.terms_ar ?? "",
      terms_en: policy?.terms_en ?? "",
      active: policy ? isOn(policy.active) : true,
    },
  });
  const { errors, dirtyFields, isDirty } = form.formState;
  const err = (k: keyof Values) => errors[k]?.message;
  const transferable = useWatch({ control: form.control, name: "transferable" });

  const onSubmit = form.handleSubmit((v) => {
    setFormError(null);
    const all: PolicyInput = {
      category: v.category,
      name_ar: v.name_ar.trim(),
      name_en: v.name_en.trim(),
      transferable: fromTransfer(v.transferable),
      terms_ar: v.terms_ar.trim() || null,
      terms_en: v.terms_en.trim() || null,
      active: v.active,
      ...(isNew ? { months: Number(v.months) } : {}),
    };
    const body = isNew ? all : Object.fromEntries(Object.entries(all).filter(([k]) => dirtyFields[k as keyof Values]));
    save.mutate(
      { id: policy?.id ?? null, body, key: idempotency.key },
      {
        onSuccess: () => {
          idempotency.renew();
          toast.success(isNew ? t("warranty.created") : t("warranty.saved"));
          onClose();
        },
        onError: (e) => {
          if (toApiError(e).code === "IDEMPOTENCY_CONFLICT") idempotency.renew();
          if (!applyServerErrors(e, form.setError, ["category", "name_ar", "name_en", "months", "terms_ar", "terms_en"])) setFormError(errorMessage(e));
        },
      },
    );
  });

  return (
    <FormSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={isNew ? t("warranty.newPolicy") : t("warranty.editPolicy")}
      onSubmit={onSubmit}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={save.isPending || (!isNew && !isDirty)}>
            {save.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
            {isNew ? t("common.create") : t("common.save")}
          </Button>
        </>
      }
    >
      <fieldset disabled={save.isPending} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="wp-category" label={t("warranty.fields.category")} required error={err("category")}>
            <Controller
              control={form.control}
              name="category"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={!isNew}>
                  <SelectTrigger id="wp-category" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WARRANTY_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {t(`units.eligibility.categories.${c}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field
            id="wp-months"
            label={t("warranty.fields.months")}
            required={isNew}
            error={err("months")}
            description={!isNew ? t("warranty.durationLocked") : undefined}
          >
            <div className="relative">
              <Input {...fieldA11y("wp-months", err("months"), !isNew)} inputMode="numeric" dir="ltr" disabled={!isNew} {...form.register("months")} />
              {!isNew && <Lock aria-hidden className="absolute end-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />}
            </div>
          </Field>
        </div>
        <Field id="wp-name-ar" label={t("warranty.fields.nameAr")} required error={err("name_ar")}>
          <Input {...fieldA11y("wp-name-ar", err("name_ar"))} dir="rtl" {...form.register("name_ar")} />
        </Field>
        <Field id="wp-name-en" label={t("warranty.fields.nameEn")} required error={err("name_en")}>
          <Input {...fieldA11y("wp-name-en", err("name_en"))} dir="ltr" {...form.register("name_en")} />
        </Field>
        <Field id="wp-transfer" label={t("warranty.fields.transferable")}>
          <Controller
            control={form.control}
            name="transferable"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="wp-transfer" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["yes", "no", "undecided"] as const).map((v) => (
                    <SelectItem key={v} value={v}>
                      {t(`warranty.transferable.${v}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        {transferable === "undecided" && (
          <p className="flex gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
            <Info aria-hidden className="size-4 shrink-0" />
            {t("warranty.undecidedHint")}
          </p>
        )}
        <Field id="wp-terms-ar" label={t("warranty.fields.termsAr")}>
          <Textarea id="wp-terms-ar" dir="rtl" rows={3} {...form.register("terms_ar")} />
        </Field>
        <Field id="wp-terms-en" label={t("warranty.fields.termsEn")}>
          <Textarea id="wp-terms-en" dir="ltr" rows={3} {...form.register("terms_en")} />
        </Field>
        <CheckboxField control={form.control} name="active" label={t("warranty.fields.active")} />
      </fieldset>
      <FormError>{formError}</FormError>
    </FormSheet>
  );
}
