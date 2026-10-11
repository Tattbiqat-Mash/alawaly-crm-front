"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { CheckboxField } from "@/components/shared/form/checkbox-field";
import { Field, fieldA11y } from "@/components/shared/form/field";
import { FormSheet } from "@/components/shared/form/form-sheet";
import { applyServerErrors } from "@/components/shared/form/server-errors";
import { ErrorState, FormError } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { Project } from "@/features/inventory/types";
import { useErrorMessage } from "@/hooks/use-error-message";
import { toApiError } from "@/lib/api/errors";
import { useIdempotencyKey } from "@/lib/api/idempotency";
import { isOn } from "@/lib/format/localized";
import type { ProjectInput } from "../api";
import { useProject, useSaveProject } from "../hooks";

const NONE = "none";
export const AVAILABILITY_VALUES = ["available", "app_only", "crm_only"] as const;
type Availability = (typeof AVAILABILITY_VALUES)[number];
const isAvailability = (v: unknown): v is Availability => AVAILABILITY_VALUES.includes(v as Availability);

type Values = {
  nameAr: string;
  nameEn: string;
  status: string;
  availability: string;
  developing_percentage: string;
  display_order: string;
  featured: boolean;
  active: boolean;
};

const toValues = (p?: Project): Values => ({
  nameAr: p?.nameAr ?? "",
  nameEn: p?.nameEn ?? "",
  status: p?.status ?? "",
  availability: p?.availability ?? NONE,
  developing_percentage: p?.developing_percentage == null ? "" : String(p.developing_percentage),
  display_order: p?.display_order == null ? "" : String(p.display_order),
  featured: isOn(p?.featured),
  active: p ? isOn(p.active) : true,
});

const intOrNull = (v: string) => (v.trim() === "" ? null : Number.parseInt(v, 10));

/** S08 create/edit in a side sheet. `projectId` null = new project. */
export function ProjectFormSheet({
  open,
  projectId,
  statusSuggestions,
  canEdit,
  onClose,
}: {
  open: boolean;
  projectId: number | null;
  statusSuggestions: string[];
  canEdit: boolean;
  onClose: () => void;
}) {
  const project = useProject(open ? projectId : null);
  const isNew = projectId === null;
  const t = useTranslations();
  if (!open) return null;
  if (!isNew && !project.data) {
    // Load the full record (list rows omit some fields) inside the same sheet.
    return (
      <FormSheet
        open
        onOpenChange={(o) => !o && onClose()}
        title={t("projects.editTitle")}
        onSubmit={(e) => e.preventDefault()}
        footer={
          <Button type="button" variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
        }
      >
        {project.error ? (
          <ErrorState compact error={project.error} onRetry={() => project.refetch()} />
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
  return (
    <ProjectForm
      key={projectId ?? "new"}
      project={isNew ? undefined : project.data}
      projectId={projectId}
      statusSuggestions={statusSuggestions}
      canEdit={canEdit}
      onClose={onClose}
    />
  );
}

function ProjectForm({
  project,
  projectId,
  statusSuggestions,
  canEdit,
  onClose,
}: {
  project?: Project;
  projectId: number | null;
  statusSuggestions: string[];
  canEdit: boolean;
  onClose: () => void;
}) {
  const t = useTranslations();
  const errorMessage = useErrorMessage();
  const save = useSaveProject();
  const idempotency = useIdempotencyKey();
  const [formError, setFormError] = useState<string | null>(null);
  const isNew = projectId === null;

  const required = t("validation.required");
  const schema = z.object({
    nameAr: z.string().trim().min(1, required),
    nameEn: z.string().trim().min(1, required),
    status: z.string().trim().max(50),
    availability: z.string(),
    developing_percentage: z
      .string()
      .trim()
      .refine((v) => v === "" || (/^\d{1,3}$/.test(v) && Number(v) <= 100), t("projects.percentInvalid")),
    display_order: z.string().trim().regex(/^\d*$/, t("validation.wholeNumber")),
    featured: z.boolean(),
    active: z.boolean(),
  });

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(project) });
  const { errors, dirtyFields, isDirty } = form.formState;
  const err = (k: keyof Values) => errors[k]?.message;

  const onSubmit = form.handleSubmit((v) => {
    setFormError(null);
    const all: ProjectInput = {
      nameAr: v.nameAr.trim(),
      nameEn: v.nameEn.trim(),
      status: v.status.trim() || null,
      availability: v.availability === NONE ? null : v.availability,
      developing_percentage: intOrNull(v.developing_percentage),
      display_order: intOrNull(v.display_order),
      featured: v.featured,
      active: v.active,
    };
    // New: send everything filled in. Edit: only what changed.
    const body = isNew
      ? Object.fromEntries(Object.entries(all).filter(([, value]) => value !== null && value !== ""))
      : Object.fromEntries(Object.entries(all).filter(([k]) => dirtyFields[k as keyof Values]));
    save.mutate(
      { id: projectId, body, idempotencyKey: idempotency.key },
      {
        onSuccess: () => {
          idempotency.renew();
          toast.success(isNew ? t("projects.created") : t("projects.saved"));
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
      title={isNew ? t("projects.new") : t("projects.editTitle")}
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
        <Field id="p-nameAr" label={t("common.nameAr")} required error={err("nameAr")}>
          <Input {...fieldA11y("p-nameAr", err("nameAr"))} dir="rtl" {...form.register("nameAr")} />
        </Field>
        <Field id="p-nameEn" label={t("common.nameEn")} required error={err("nameEn")}>
          <Input {...fieldA11y("p-nameEn", err("nameEn"))} dir="ltr" {...form.register("nameEn")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="p-status" label={t("projects.fields.status")} error={err("status")} description={t("projects.statusHint")}>
            <Input {...fieldA11y("p-status", err("status"), true)} dir="ltr" list="p-status-options" {...form.register("status")} />
            <datalist id="p-status-options">
              {statusSuggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
          <Field id="p-availability" label={t("projects.fields.availability")} error={err("availability")}>
            <Controller
              control={form.control}
              name="availability"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={!canEdit}>
                  <SelectTrigger {...fieldA11y("p-availability", err("availability"))} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {AVAILABILITY_VALUES.map((a) => (
                      <SelectItem key={a} value={a}>
                        {t(`statuses.availability.${a}`)}
                      </SelectItem>
                    ))}
                    {!isAvailability(field.value) && field.value !== NONE && <SelectItem value={field.value}>{field.value}</SelectItem>}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field id="p-percent" label={t("projects.fields.complete")} error={err("developing_percentage")}>
            <Input {...fieldA11y("p-percent", err("developing_percentage"))} inputMode="numeric" dir="ltr" {...form.register("developing_percentage")} />
          </Field>
          <Field id="p-order" label={t("projects.fields.displayOrder")} error={err("display_order")}>
            <Input {...fieldA11y("p-order", err("display_order"))} inputMode="numeric" dir="ltr" {...form.register("display_order")} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-6">
          <CheckboxField control={form.control} name="featured" label={t("projects.fields.featured")} disabled={!canEdit} />
          <CheckboxField control={form.control} name="active" label={t("projects.fields.active")} disabled={!canEdit} />
        </div>
      </fieldset>
      <FormError>{formError}</FormError>
    </FormSheet>
  );
}
