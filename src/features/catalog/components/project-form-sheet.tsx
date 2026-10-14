"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Loader2, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
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
import type { NamedRef, ProjectDetail } from "@/features/inventory/types";
import { useErrorMessage } from "@/hooks/use-error-message";
import { toApiError } from "@/lib/api/errors";
import { useIdempotencyKey } from "@/lib/api/idempotency";
import { isOn } from "@/lib/format/localized";
import type { ProjectInput } from "../api";
import { useProject, useSaveProject } from "../hooks";
import { FeaturePicker } from "./feature-picker";

const NONE = "none";
export const AVAILABILITY_VALUES = ["available", "app_only", "crm_only"] as const;
type Availability = (typeof AVAILABILITY_VALUES)[number];
const isAvailability = (v: unknown): v is Availability => AVAILABILITY_VALUES.includes(v as Availability);

type Values = {
  nameAr: string;
  nameEn: string;
  project_code: string;
  status: string;
  availability: string;
  developer_id: string;
  country_id: string;
  city_id: string;
  license_num: string;
  addressEn: string;
  location_lang_lat: string;
  developing_percentage: string;
  total_area: string;
  developing_start_date: string;
  developing_end_date: string;
  estimated_delivery_date: string;
  descriptionEn: string;
  project_image: string;
  media: string[];
  documents: { name: string; url: string }[];
  features: number[];
  display_order: string;
  featured: boolean;
  active: boolean;
  stages: { nameAr: string; nameEn: string; start_date: string }[];
};
type FieldName = keyof Values;

const str = (v: string | number | null | undefined) => (v == null ? "" : String(v));
const day = (v: string | null | undefined) => (v ? v.slice(0, 10) : "");

const toValues = (p?: ProjectDetail): Values => ({
  nameAr: p?.nameAr ?? "",
  nameEn: p?.nameEn ?? "",
  project_code: p?.project_code ?? "",
  status: p?.status ?? "",
  availability: p?.availability ?? NONE,
  developer_id: str(p?.developer_id),
  country_id: str(p?.country_id),
  city_id: str(p?.city_id),
  license_num: p?.license_num ?? "",
  addressEn: p?.addressEn ?? "",
  location_lang_lat: p?.location_lang_lat ?? "",
  developing_percentage: str(p?.developing_percentage),
  total_area: str(p?.total_area),
  developing_start_date: day(p?.developing_start_date),
  developing_end_date: day(p?.developing_end_date),
  estimated_delivery_date: day(p?.estimated_delivery_date),
  descriptionEn: p?.descriptionEn ?? "",
  project_image: p?.project_image ?? "",
  media: p?.media ?? [],
  documents: p?.documents ?? [],
  features: p?.features ?? [],
  display_order: str(p?.display_order),
  featured: isOn(p?.featured),
  active: p ? isOn(p.active) : true,
  stages: [],
});

const intOrNull = (v: string) => (v.trim() === "" ? null : Number.parseInt(v, 10));
const textOrNull = (v: string) => v.trim() || null;

function toInput(v: Values): Required<ProjectInput> {
  return {
    nameAr: v.nameAr.trim(),
    nameEn: v.nameEn.trim(),
    project_code: textOrNull(v.project_code),
    status: textOrNull(v.status),
    availability: v.availability === NONE ? null : v.availability,
    developer_id: intOrNull(v.developer_id),
    country_id: intOrNull(v.country_id),
    city_id: intOrNull(v.city_id),
    license_num: textOrNull(v.license_num),
    addressEn: textOrNull(v.addressEn),
    location_lang_lat: textOrNull(v.location_lang_lat.replace(/\s+/g, "")),
    developing_percentage: intOrNull(v.developing_percentage),
    total_area: v.total_area.trim() === "" ? null : Number(v.total_area),
    developing_start_date: v.developing_start_date || null,
    developing_end_date: v.developing_end_date || null,
    estimated_delivery_date: v.estimated_delivery_date || null,
    descriptionEn: textOrNull(v.descriptionEn),
    project_image: textOrNull(v.project_image),
    media: v.media,
    documents: v.documents.map((d) => ({ name: d.name.trim(), url: d.url.trim() })).filter((d) => d.name && d.url),
    features: v.features,
    display_order: intOrNull(v.display_order),
    featured: v.featured,
    active: v.active,
    stages: v.stages.map((s) => ({ nameAr: s.nameAr.trim(), nameEn: s.nameEn.trim(), start_date: s.start_date || null })),
  };
}

const isEmpty = (value: unknown) => value === null || value === "" || (Array.isArray(value) && value.length === 0);

/** S08 create/edit in a side sheet. `projectId` null = new project. */
export function ProjectFormSheet({
  open,
  projectId,
  statusSuggestions,
  canEdit,
  onClose,
  onCreated,
}: {
  open: boolean;
  projectId: number | null;
  statusSuggestions: string[];
  canEdit: boolean;
  onClose: () => void;
  onCreated?: (id: number) => void;
}) {
  const project = useProject(open ? projectId : null);
  const isNew = projectId === null;
  const t = useTranslations();
  if (!open) return null;
  if (!isNew && !project.data) {
    // Load the full record (list rows omit most fields) inside the same sheet.
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
      onCreated={onCreated}
    />
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-4">
      <h3 className="border-b pb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
      {children}
    </section>
  );
}

/** Resolved name of a related record the API returns next to its id. */
const refHint = (ref: NamedRef | null | undefined) => (ref ? [ref.nameEn, ref.nameAr].filter(Boolean).join(" · ") : undefined);

function ProjectForm({
  project,
  projectId,
  statusSuggestions,
  canEdit,
  onClose,
  onCreated,
}: {
  project?: ProjectDetail;
  projectId: number | null;
  statusSuggestions: string[];
  canEdit: boolean;
  onClose: () => void;
  onCreated?: (id: number) => void;
}) {
  const t = useTranslations();
  const errorMessage = useErrorMessage();
  const save = useSaveProject();
  const idempotency = useIdempotencyKey();
  const [formError, setFormError] = useState<string | null>(null);
  const isNew = projectId === null;

  const required = t("validation.required");
  const whole = z.string().trim().regex(/^\d*$/, t("validation.wholeNumber"));
  const schema = z
    .object({
      nameAr: z.string().trim().min(1, required),
      nameEn: z.string().trim().min(1, required),
      project_code: z.string().trim().max(50),
      status: z.string().trim().max(50),
      availability: z.string(),
      developer_id: whole,
      country_id: whole,
      city_id: whole,
      license_num: z.string().trim().max(100),
      addressEn: z.string().trim().max(255),
      location_lang_lat: z
        .string()
        .trim()
        .refine((v) => v === "" || /^-?\d{1,3}(\.\d+)?,\s*-?\d{1,3}(\.\d+)?$/.test(v), t("projects.locationInvalid")),
      developing_percentage: z
        .string()
        .trim()
        .refine((v) => v === "" || (/^\d{1,3}$/.test(v) && Number(v) <= 100), t("projects.percentInvalid")),
      total_area: z.string().trim().regex(/^(\d+(\.\d{1,3})?)?$/, t("units.form.decimal")),
      developing_start_date: z.string(),
      developing_end_date: z.string(),
      estimated_delivery_date: z.string(),
      descriptionEn: z.string().max(5000),
      project_image: z.string().trim().max(500),
      media: z.array(z.string()),
      documents: z.array(z.object({ name: z.string().trim().min(1, required), url: z.string().trim().min(1, required) })),
      features: z.array(z.number()),
      display_order: whole,
      featured: z.boolean(),
      active: z.boolean(),
      stages: z.array(z.object({ nameAr: z.string().trim().min(1, required), nameEn: z.string().trim().min(1, required), start_date: z.string() })),
    })
    .refine((v) => !v.developing_start_date || !v.developing_end_date || v.developing_start_date <= v.developing_end_date, {
      path: ["developing_end_date"],
      message: t("projects.endBeforeStart"),
    });

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(project) });
  const documents = useFieldArray({ control: form.control, name: "documents" });
  const stages = useFieldArray({ control: form.control, name: "stages" });
  const { errors, isDirty } = form.formState;
  const err = (k: FieldName) => errors[k]?.message;
  const text = (name: FieldName, opts: { label: string; dir?: "ltr" | "rtl"; required?: boolean; description?: ReactNode; inputMode?: "numeric" | "decimal"; type?: string }) => (
    <Field id={`p-${name}`} label={opts.label} required={opts.required} error={err(name)} description={opts.description}>
      <Input
        {...fieldA11y(`p-${name}`, err(name), opts.description)}
        dir={opts.dir}
        inputMode={opts.inputMode}
        type={opts.type}
        {...form.register(name)}
      />
    </Field>
  );

  const onSubmit = form.handleSubmit((v) => {
    setFormError(null);
    const touched = isNew || form.getFieldState("featured").isDirty || form.getFieldState("features").isDirty;
    if (touched && v.featured && v.features.length === 0) {
      form.setError("features", { type: "validate", message: t("projects.featuredNeedsFeatures") });
      return;
    }
    const all = toInput(v);
    // New: everything filled in (stages only when added). Edit: only what changed; stages are not edited here.
    const body: ProjectInput = isNew
      ? Object.fromEntries(Object.entries(all).filter(([, value]) => !isEmpty(value)))
      : Object.fromEntries(
          Object.entries(all).filter(([k]) => k !== "stages" && form.getFieldState(k as FieldName).isDirty),
        );
    save.mutate(
      { id: projectId, body, idempotencyKey: idempotency.key },
      {
        onSuccess: (saved) => {
          idempotency.renew();
          toast.success(isNew ? t("projects.created") : t("projects.saved"));
          onClose();
          if (isNew && saved?.id) onCreated?.(saved.id);
        },
        onError: (e) => {
          if (toApiError(e).code === "IDEMPOTENCY_CONFLICT") idempotency.renew();
          if (!applyServerErrors(e, form.setError, Object.keys(all) as FieldName[])) setFormError(errorMessage(e));
        },
      },
    );
  });

  return (
    <FormSheet
      open
      wide
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
      <fieldset disabled={!canEdit || save.isPending} className="grid gap-6">
        <Section title={t("projects.sections.basics")}>
          <div className="grid gap-4 sm:grid-cols-2">
            {text("nameAr", { label: t("common.nameAr"), dir: "rtl", required: true })}
            {text("nameEn", { label: t("common.nameEn"), dir: "ltr", required: true })}
            {text("project_code", { label: t("projects.fields.code"), dir: "ltr" })}
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
            {text("display_order", { label: t("projects.fields.displayOrder"), dir: "ltr", inputMode: "numeric" })}
          </div>
          <div className="flex flex-wrap gap-6">
            <CheckboxField control={form.control} name="featured" label={t("projects.fields.featured")} disabled={!canEdit} />
            <CheckboxField control={form.control} name="active" label={t("projects.fields.active")} disabled={!canEdit} />
          </div>
        </Section>

        <Section title={t("projects.sections.location")}>
          <div className="grid gap-4 sm:grid-cols-2">
            {text("country_id", { label: t("projects.fields.countryId"), dir: "ltr", inputMode: "numeric", description: refHint(project?.country) })}
            {text("city_id", { label: t("projects.fields.cityId"), dir: "ltr", inputMode: "numeric", description: refHint(project?.city) })}
            {text("addressEn", { label: t("projects.fields.addressEn"), dir: "ltr" })}
            {text("location_lang_lat", { label: t("projects.fields.location"), dir: "ltr", description: t("projects.locationHint") })}
          </div>
        </Section>

        <Section title={t("projects.sections.development")}>
          <div className="grid gap-4 sm:grid-cols-2">
            {text("developer_id", { label: t("projects.fields.developerId"), dir: "ltr", inputMode: "numeric", description: refHint(project?.developer) })}
            {text("license_num", { label: t("projects.fields.license"), dir: "ltr" })}
            {text("developing_percentage", { label: t("projects.fields.complete"), dir: "ltr", inputMode: "numeric" })}
            {text("total_area", { label: t("projects.fields.totalArea"), dir: "ltr", inputMode: "decimal" })}
            {text("developing_start_date", { label: t("projects.fields.startDate"), dir: "ltr", type: "date" })}
            {text("developing_end_date", { label: t("projects.fields.endDate"), dir: "ltr", type: "date" })}
            {text("estimated_delivery_date", { label: t("projects.fields.deliveryDate"), dir: "ltr", type: "date" })}
          </div>
        </Section>

        <Section title={t("projects.sections.description")}>
          <Field id="p-descriptionEn" label={t("projects.fields.descriptionEn")} error={err("descriptionEn")}>
            <Textarea {...fieldA11y("p-descriptionEn", err("descriptionEn"))} dir="ltr" rows={3} {...form.register("descriptionEn")} />
          </Field>
        </Section>

        <Section title={t("projects.sections.media")}>
          <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
            <Field id="p-project_image" label={t("projects.fields.image")} error={err("project_image")}>
              <Controller
                control={form.control}
                name="project_image"
                render={({ field }) => (
                  <MediaListInput
                    id="p-project_image"
                    max={1}
                    value={field.value ? [field.value] : []}
                    onChange={(next) => field.onChange(next[0] ?? "")}
                    disabled={!canEdit}
                    invalid={Boolean(err("project_image"))}
                  />
                )}
              />
            </Field>
            <Field id="p-media" label={t("projects.fields.media")} error={err("media")}>
              <Controller
                control={form.control}
                name="media"
                render={({ field }) => <MediaListInput id="p-media" value={field.value} onChange={field.onChange} disabled={!canEdit} />}
              />
            </Field>
          </div>
          <div className="grid gap-2">
            <span className="text-xs font-semibold text-foreground/90">{t("projects.fields.documents")}</span>
            {documents.fields.map((doc, i) => (
              <div key={doc.id} className="grid grid-cols-[1fr_1.5fr_auto] items-start gap-2">
                <Input
                  aria-label={t("projects.fields.documentName")}
                  placeholder={t("projects.fields.documentName")}
                  aria-invalid={errors.documents?.[i]?.name ? true : undefined}
                  {...form.register(`documents.${i}.name`)}
                />
                <Input
                  aria-label={t("projects.fields.documentUrl")}
                  placeholder={t("projects.fields.documentUrl")}
                  dir="ltr"
                  aria-invalid={errors.documents?.[i]?.url ? true : undefined}
                  {...form.register(`documents.${i}.url`)}
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => documents.remove(i)} aria-label={t("common.remove")}>
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => documents.append({ name: "", url: "" })}>
              <Plus data-icon="inline-start" />
              {t("projects.addDocument")}
            </Button>
          </div>
        </Section>

        <Section title={t("projects.sections.features")}>
          <Field id="p-features" label={t("projects.fields.features")} error={err("features")}>
            <Controller
              control={form.control}
              name="features"
              render={({ field }) => (
                <FeaturePicker
                  id="p-features"
                  type="project"
                  value={field.value}
                  onChange={field.onChange}
                  known={project?.feature_items}
                  disabled={!canEdit}
                />
              )}
            />
          </Field>
        </Section>

        {isNew && (
          <Section title={t("projects.sections.stages")}>
            <p className="-mt-2 text-xs text-muted-foreground">{t("projects.stagesHint")}</p>
            {stages.fields.map((stage, i) => (
              <div key={stage.id} className="grid grid-cols-[1fr_1fr_9rem_auto] items-start gap-2">
                <Input
                  aria-label={t("common.nameAr")}
                  placeholder={t("common.nameAr")}
                  dir="rtl"
                  aria-invalid={errors.stages?.[i]?.nameAr ? true : undefined}
                  {...form.register(`stages.${i}.nameAr`)}
                />
                <Input
                  aria-label={t("common.nameEn")}
                  placeholder={t("common.nameEn")}
                  dir="ltr"
                  aria-invalid={errors.stages?.[i]?.nameEn ? true : undefined}
                  {...form.register(`stages.${i}.nameEn`)}
                />
                <Input type="date" dir="ltr" aria-label={t("projects.fields.stageStart")} {...form.register(`stages.${i}.start_date`)} />
                <Button type="button" variant="ghost" size="icon" onClick={() => stages.remove(i)} aria-label={t("common.remove")}>
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="justify-self-start"
              onClick={() => stages.append({ nameAr: "", nameEn: "", start_date: "" })}
            >
              <Plus data-icon="inline-start" />
              {t("projects.addStage")}
            </Button>
          </Section>
        )}
      </fieldset>
      <FormError>{formError}</FormError>
    </FormSheet>
  );
}
