"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { DataTable, type Column } from "@/components/shared/data-table/data-table";
import { paginationProps } from "@/components/shared/data-table/list-params";
import { CheckboxField } from "@/components/shared/form/checkbox-field";
import { Field, fieldA11y } from "@/components/shared/form/field";
import { FormSheet } from "@/components/shared/form/form-sheet";
import { applyServerErrors } from "@/components/shared/form/server-errors";
import { EmptyState, FormError } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ActiveBadge } from "@/features/catalog/components/active-badge";
import { useErrorMessage } from "@/hooks/use-error-message";
import { toApiError } from "@/lib/api/errors";
import { useIdempotencyKey } from "@/lib/api/idempotency";
import { isOn } from "@/lib/format/localized";
import { fillPlaceholders, PLACEHOLDERS, type NotificationTemplate, type TemplateInput } from "../api";
import { useSaveTemplate, useTemplates, useTemplatesState } from "../hooks";

type Values = { key: string; title_ar: string; title_en: string; body_ar: string; body_en: string; active: boolean };

function TemplateSheet({ template, onClose }: { template?: NotificationTemplate; onClose: () => void }) {
  const t = useTranslations();
  const errorMessage = useErrorMessage();
  const save = useSaveTemplate();
  const idempotency = useIdempotencyKey();
  const [formError, setFormError] = useState<string | null>(null);
  const isNew = !template;

  const required = t("validation.required");
  const schema = z.object({
    key: z.string().trim().regex(/^[a-z0-9_.]+$/, t("templates.keyInvalid")),
    title_ar: z.string().trim().min(1, required),
    title_en: z.string().trim().min(1, required),
    body_ar: z.string().trim().min(1, required),
    body_en: z.string().trim().min(1, required),
    active: z.boolean(),
  });
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      key: template?.key ?? "",
      title_ar: template?.title_ar ?? "",
      title_en: template?.title_en ?? "",
      body_ar: template?.body_ar ?? "",
      body_en: template?.body_en ?? "",
      active: template ? isOn(template.active) : true,
    },
  });
  const { errors, dirtyFields, isDirty } = form.formState;
  const err = (k: keyof Values) => errors[k]?.message;
  const [titleAr, titleEn, bodyAr, bodyEn] = useWatch({ control: form.control, name: ["title_ar", "title_en", "body_ar", "body_en"] });

  const onSubmit = form.handleSubmit((v) => {
    setFormError(null);
    const all: TemplateInput = { key: v.key.trim(), title_ar: v.title_ar.trim(), title_en: v.title_en.trim(), body_ar: v.body_ar.trim(), body_en: v.body_en.trim(), active: v.active };
    // The key is fixed after creation.
    const body = isNew ? all : Object.fromEntries(Object.entries(all).filter(([k]) => k !== "key" && dirtyFields[k as keyof Values]));
    save.mutate(
      { id: template?.id ?? null, body, key: idempotency.key },
      {
        onSuccess: () => {
          idempotency.renew();
          toast.success(isNew ? t("templates.created") : t("templates.saved"));
          onClose();
        },
        onError: (e) => {
          if (toApiError(e).code === "IDEMPOTENCY_CONFLICT") idempotency.renew();
          if (!applyServerErrors(e, form.setError, ["key", "title_ar", "title_en", "body_ar", "body_en"])) setFormError(errorMessage(e));
        },
      },
    );
  });

  return (
    <FormSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={isNew ? t("templates.new") : t("templates.editTitle")}
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
        <Field id="tp-key" label={t("templates.fields.key")} required error={err("key")} description={t("templates.fields.keyHint")}>
          <Input {...fieldA11y("tp-key", err("key"), true)} dir="ltr" disabled={!isNew} {...form.register("key")} />
        </Field>
        <Field id="tp-title-ar" label={t("templates.fields.titleAr")} required error={err("title_ar")}>
          <Input {...fieldA11y("tp-title-ar", err("title_ar"))} dir="rtl" {...form.register("title_ar")} />
        </Field>
        <Field id="tp-body-ar" label={t("templates.fields.bodyAr")} required error={err("body_ar")}>
          <Textarea {...fieldA11y("tp-body-ar", err("body_ar"))} dir="rtl" rows={3} {...form.register("body_ar")} />
        </Field>
        <Field id="tp-title-en" label={t("templates.fields.titleEn")} required error={err("title_en")}>
          <Input {...fieldA11y("tp-title-en", err("title_en"))} dir="ltr" {...form.register("title_en")} />
        </Field>
        <Field id="tp-body-en" label={t("templates.fields.bodyEn")} required error={err("body_en")}>
          <Textarea {...fieldA11y("tp-body-en", err("body_en"))} dir="ltr" rows={3} {...form.register("body_en")} />
        </Field>
        <CheckboxField control={form.control} name="active" label={t("templates.fields.active")} />
      </fieldset>

      <div className="grid gap-2 rounded-lg border bg-muted/30 p-3 text-xs">
        <p className="font-medium">{t("templates.placeholders")}</p>
        <p className="flex flex-wrap gap-2 font-mono" dir="ltr">
          {Object.keys(PLACEHOLDERS).map((p) => (
            <code key={p} className="rounded bg-background px-1.5 py-0.5">
              {p}
            </code>
          ))}
        </p>
      </div>
      <div className="grid gap-2">
        <p className="text-sm font-medium">{t("templates.preview")}</p>
        {(
          [
            ["ar", titleAr, bodyAr],
            ["en", titleEn, bodyEn],
          ] as const
        ).map(([lang, title, body]) => (
          <div key={lang} lang={lang} dir={lang === "ar" ? "rtl" : "ltr"} className="rounded-lg border bg-card p-3 shadow-2xs">
            <p className="text-sm font-semibold">{fillPlaceholders(title || "—", lang)}</p>
            <p className="mt-1 text-sm text-muted-foreground">{fillPlaceholders(body || "—", lang)}</p>
          </div>
        ))}
      </div>
      <FormError>{formError}</FormError>
    </FormSheet>
  );
}

// S27 — Notification templates.
export function TemplatesView() {
  const t = useTranslations();
  const locale = useLocale();
  const [state, setState] = useTemplatesState();
  const list = useTemplates(state);
  const [sheet, setSheet] = useState<null | "new" | NotificationTemplate>(null);

  const columns: Column<NotificationTemplate>[] = [
    { id: "key", header: t("templates.columns.key"), cell: (x) => <code className="font-mono text-xs" dir="ltr">{x.key}</code> },
    { id: "title", header: t("templates.columns.title"), cell: (x) => (locale === "ar" ? x.title_ar : x.title_en) ?? "—" },
    { id: "active", header: t("templates.columns.active"), cell: (x) => <ActiveBadge value={x.active} /> },
  ];

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setSheet("new")}>
          <Plus data-icon="inline-start" />
          {t("templates.new")}
        </Button>
      </div>
      <DataTable
        caption={t("templates.title")}
        columns={columns}
        rows={list.data?.items}
        getRowId={(x) => x.id}
        getRowLabel={(x) => x.key}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        error={list.error}
        onRetry={() => list.refetch()}
        onRowClick={(x) => setSheet(x)}
        pagination={paginationProps(list.data?.meta, setState)}
        empty={<EmptyState compact title={t("templates.empty")} />}
      />
      {sheet !== null && <TemplateSheet key={sheet === "new" ? "new" : sheet.id} template={sheet === "new" ? undefined : sheet} onClose={() => setSheet(null)} />}
    </>
  );
}
