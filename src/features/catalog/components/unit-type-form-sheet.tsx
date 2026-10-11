"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { CheckboxField } from "@/components/shared/form/checkbox-field";
import { Field, fieldA11y } from "@/components/shared/form/field";
import { FormSheet } from "@/components/shared/form/form-sheet";
import { applyServerErrors } from "@/components/shared/form/server-errors";
import { FormError } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { UnitType } from "@/features/inventory/types";
import { useErrorMessage } from "@/hooks/use-error-message";
import { toApiError } from "@/lib/api/errors";
import { useIdempotencyKey } from "@/lib/api/idempotency";
import { isOn } from "@/lib/format/localized";
import type { UnitTypeInput } from "../api";
import { useSaveUnitType } from "../hooks";

type Values = { nameAr: string; nameEn: string; active: boolean };

/** S10 create/edit a unit type. `unitType` undefined = new. */
export function UnitTypeFormSheet({ unitType, canEdit, onClose }: { unitType?: UnitType; canEdit: boolean; onClose: () => void }) {
  const t = useTranslations();
  const errorMessage = useErrorMessage();
  const save = useSaveUnitType();
  const idempotency = useIdempotencyKey();
  const [formError, setFormError] = useState<string | null>(null);
  const isNew = !unitType;

  const required = t("validation.required");
  const schema = z.object({ nameAr: z.string().trim().min(1, required), nameEn: z.string().trim().min(1, required), active: z.boolean() });
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { nameAr: unitType?.nameAr ?? "", nameEn: unitType?.nameEn ?? "", active: unitType ? isOn(unitType.active) : true },
  });
  const { errors, dirtyFields, isDirty } = form.formState;
  const err = (k: keyof Values) => errors[k]?.message;

  const onSubmit = form.handleSubmit((v) => {
    setFormError(null);
    const all: UnitTypeInput = { nameAr: v.nameAr.trim(), nameEn: v.nameEn.trim(), active: v.active };
    const body = isNew ? all : Object.fromEntries(Object.entries(all).filter(([k]) => dirtyFields[k as keyof Values]));
    save.mutate(
      { id: unitType?.id ?? null, body, idempotencyKey: idempotency.key },
      {
        onSuccess: () => {
          idempotency.renew();
          toast.success(isNew ? t("unitTypes.created") : t("unitTypes.saved"));
          onClose();
        },
        onError: (e) => {
          if (toApiError(e).code === "IDEMPOTENCY_CONFLICT") idempotency.renew();
          if (!applyServerErrors(e, form.setError, ["nameAr", "nameEn", "active"])) setFormError(errorMessage(e));
        },
      },
    );
  });

  return (
    <FormSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={isNew ? t("unitTypes.new") : t("unitTypes.editTitle")}
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
      <fieldset disabled={!canEdit || save.isPending} className="grid gap-4">
        <Field id="ut-nameAr" label={t("common.nameAr")} required error={err("nameAr")}>
          <Input {...fieldA11y("ut-nameAr", err("nameAr"))} dir="rtl" {...form.register("nameAr")} />
        </Field>
        <Field id="ut-nameEn" label={t("common.nameEn")} required error={err("nameEn")}>
          <Input {...fieldA11y("ut-nameEn", err("nameEn"))} dir="ltr" {...form.register("nameEn")} />
        </Field>
        <CheckboxField control={form.control} name="active" label={t("common.active")} disabled={!canEdit} />
      </fieldset>
      <FormError>{formError}</FormError>
    </FormSheet>
  );
}
