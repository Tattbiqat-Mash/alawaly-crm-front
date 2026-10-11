"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useErrorMessage } from "@/hooks/use-error-message";
import { toApiError } from "@/lib/api/errors";
import { useIdempotencyKey } from "@/lib/api/idempotency";
import { isOn, localizedName } from "@/lib/format/localized";
import type { Contractor, Resource, Team, Technician } from "../api";
import { useAllResources, useSaveResource } from "../hooks";

const NONE = "none";

type Values = {
  name: string;
  name_ar: string;
  name_en: string;
  team_id: string;
  specialty: string;
  phone: string;
  email: string;
  contact_name: string;
  notes: string;
  active: boolean;
};

/** Which fields each resource has (from the recorded create examples). */
const FIELDS: Record<Resource, (keyof Values)[]> = {
  teams: ["name_ar", "name_en", "active"],
  technicians: ["name", "team_id", "specialty", "phone", "active"],
  contractors: ["name", "contact_name", "phone", "email", "specialty", "notes", "active"],
};

type Record_ = Team | Technician | Contractor;

function toValues(record?: Record_): Values {
  const r = (record ?? {}) as Partial<Record<keyof Values | "active", unknown>>;
  const str = (k: keyof Values) => (typeof r[k] === "string" ? (r[k] as string) : "");
  return {
    name: str("name"),
    name_ar: str("name_ar"),
    name_en: str("name_en"),
    team_id: typeof r.team_id === "number" ? String(r.team_id) : NONE,
    specialty: str("specialty"),
    phone: str("phone"),
    email: str("email"),
    contact_name: str("contact_name"),
    notes: str("notes"),
    active: record ? isOn(r.active) : true,
  };
}

export function ResourceFormSheet({ resource, record, onClose }: { resource: Resource; record?: Record_; onClose: () => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const save = useSaveResource(resource);
  const teams = useAllResources("teams");
  const idempotency = useIdempotencyKey();
  const [formError, setFormError] = useState<string | null>(null);
  const isNew = !record;
  const fields = FIELDS[resource];
  const has = (k: keyof Values) => fields.includes(k);

  const required = t("validation.required");
  const schema = z.object({
    name: has("name") ? z.string().trim().min(1, required) : z.string(),
    name_ar: has("name_ar") ? z.string().trim().min(1, required) : z.string(),
    name_en: has("name_en") ? z.string().trim().min(1, required) : z.string(),
    team_id: z.string(),
    specialty: z.string().trim().max(100),
    phone: z.string().trim().refine((v) => v === "" || /^\+?\d{8,15}$/.test(v.replace(/[\s-]/g, "")), t("maintenance.phoneInvalid")),
    email: z.string().trim().refine((v) => v === "" || z.email().safeParse(v).success, t("maintenance.emailInvalid")),
    contact_name: z.string().trim().max(100),
    notes: z.string().trim().max(1000),
    active: z.boolean(),
  });
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(record) });
  const { errors, dirtyFields, isDirty } = form.formState;
  const err = (k: keyof Values) => errors[k]?.message;

  const onSubmit = form.handleSubmit((v) => {
    setFormError(null);
    const value = (k: keyof Values) => {
      if (k === "active") return v.active;
      if (k === "team_id") return v.team_id === NONE ? null : Number(v.team_id);
      const s = (v[k] as string).trim();
      return s === "" ? null : s;
    };
    const keys = isNew ? fields : fields.filter((k) => dirtyFields[k]);
    const body = Object.fromEntries(keys.map((k) => [k, value(k)]).filter(([, val]) => !isNew || val !== null));
    save.mutate(
      { id: record?.id ?? null, body, key: idempotency.key },
      {
        onSuccess: () => {
          idempotency.renew();
          toast.success(isNew ? t("maintenance.created") : t("maintenance.saved"));
          onClose();
        },
        onError: (e) => {
          if (toApiError(e).code === "IDEMPOTENCY_CONFLICT") idempotency.renew();
          if (!applyServerErrors(e, form.setError, fields)) setFormError(errorMessage(e));
        },
      },
    );
  });

  const text = (k: "name" | "name_ar" | "name_en" | "specialty" | "phone" | "email" | "contact_name", label: string, opts: { dir?: "ltr" | "rtl"; required?: boolean; inputMode?: "tel" | "email" } = {}) =>
    has(k) && (
      <Field id={`mr-${k}`} label={label} required={opts.required} error={err(k)}>
        <Input {...fieldA11y(`mr-${k}`, err(k))} dir={opts.dir} inputMode={opts.inputMode} {...form.register(k)} />
      </Field>
    );

  return (
    <FormSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={isNew ? t(`maintenance.add.${resource}`) : t(`maintenance.edit.${resource}`)}
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
        {text("name", t("maintenance.fields.name"), { required: true })}
        {text("name_ar", t("maintenance.fields.nameAr"), { required: true, dir: "rtl" })}
        {text("name_en", t("maintenance.fields.nameEn"), { required: true, dir: "ltr" })}
        {has("team_id") && (
          <Field id="mr-team" label={t("maintenance.fields.team")}>
            <Controller
              control={form.control}
              name="team_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="mr-team" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{t("maintenance.noTeam")}</SelectItem>
                    {(teams.data ?? []).map((team) => (
                      <SelectItem key={team.id} value={String(team.id)}>
                        {localizedName(team, locale) || `#${team.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        )}
        {text("contact_name", t("maintenance.fields.contact"))}
        {text("specialty", t("maintenance.fields.specialty"))}
        {text("phone", t("maintenance.fields.phone"), { dir: "ltr", inputMode: "tel" })}
        {text("email", t("maintenance.fields.email"), { dir: "ltr", inputMode: "email" })}
        {has("notes") && (
          <Field id="mr-notes" label={t("maintenance.fields.notes")}>
            <Textarea id="mr-notes" rows={3} {...form.register("notes")} />
          </Field>
        )}
        <CheckboxField control={form.control} name="active" label={t("maintenance.fields.active")} />
      </fieldset>
      <FormError>{formError}</FormError>
    </FormSheet>
  );
}
