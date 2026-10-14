"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { DataTable, type Column } from "@/components/shared/data-table/data-table";
import { paginationProps } from "@/components/shared/data-table/list-params";
import { FilterBar, FilterSelect } from "@/components/shared/filters";
import { CheckboxField } from "@/components/shared/form/checkbox-field";
import { Field, fieldA11y } from "@/components/shared/form/field";
import { FormSheet } from "@/components/shared/form/form-sheet";
import { applyServerErrors } from "@/components/shared/form/server-errors";
import { EmptyState, FormError } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FEATURE_TYPES, type Feature, type FeatureType } from "@/features/inventory/types";
import { useErrorMessage } from "@/hooks/use-error-message";
import { isOn, localizedName } from "@/lib/format/localized";
import type { FeatureInput } from "../api";
import { useFeaturesList, useSaveFeature, useUnitTypesState } from "../hooks";
import { ActiveBadge } from "./active-badge";

// Feature catalogue (project, building and unit features). Features are retired, never deleted.
export function FeaturesTab({ canEdit }: { canEdit: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const [state, setState] = useUnitTypesState();
  const list = useFeaturesList(state);
  const [sheet, setSheet] = useState<null | "new" | Feature>(null);

  const columns: Column<Feature>[] = [
    {
      id: "name",
      header: t("features.columns.name"),
      cell: (f) => (
        <div className="flex flex-col">
          <span className="font-medium">{localizedName(f, locale) || `#${f.id}`}</span>
          <span className="text-xs text-muted-foreground">{locale === "ar" ? f.nameEn : f.nameAr}</span>
        </div>
      ),
    },
    { id: "type", header: t("features.columns.type"), cell: (f) => <StatusBadge tone="info">{t(`features.types.${f.feature_type}`)}</StatusBadge> },
    { id: "active", header: t("features.columns.active"), cell: (f) => <ActiveBadge value={f.active} /> },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FilterBar>
          <FilterSelect
            label={t("features.columns.type")}
            value={state.featureType}
            onChange={(featureType) => setState({ featureType, page: 1 })}
            options={FEATURE_TYPES.map((type) => ({ value: type, label: t(`features.types.${type}`) }))}
          />
        </FilterBar>
        {canEdit && (
          <Button onClick={() => setSheet("new")}>
            <Plus data-icon="inline-start" />
            {t("features.new")}
          </Button>
        )}
      </div>
      <DataTable
        caption={t("features.title")}
        columns={columns}
        rows={list.data?.items}
        getRowId={(f) => f.id}
        getRowLabel={(f) => localizedName(f, locale) || `#${f.id}`}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        error={list.error}
        onRetry={() => list.refetch()}
        onRowClick={(f) => setSheet(f)}
        pagination={paginationProps(list.data?.meta, setState)}
        empty={<EmptyState compact title={t("features.empty")} />}
      />
      {sheet !== null && (
        <FeatureFormSheet
          key={sheet === "new" ? "new" : sheet.id}
          feature={sheet === "new" ? undefined : sheet}
          defaultType={(state.featureType as FeatureType | null) ?? "unit"}
          canEdit={canEdit}
          onClose={() => setSheet(null)}
        />
      )}
    </>
  );
}

type Values = { nameAr: string; nameEn: string; feature_type: FeatureType; active: boolean };

function FeatureFormSheet({
  feature,
  defaultType,
  canEdit,
  onClose,
}: {
  feature?: Feature;
  defaultType: FeatureType;
  canEdit: boolean;
  onClose: () => void;
}) {
  const t = useTranslations();
  const errorMessage = useErrorMessage();
  const save = useSaveFeature();
  const [formError, setFormError] = useState<string | null>(null);
  const isNew = !feature;

  const required = t("validation.required");
  const schema = z.object({
    nameAr: z.string().trim().min(1, required).max(255),
    nameEn: z.string().trim().min(1, required).max(255),
    feature_type: z.enum(FEATURE_TYPES),
    active: z.boolean(),
  });
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      nameAr: feature?.nameAr ?? "",
      nameEn: feature?.nameEn ?? "",
      feature_type: feature?.feature_type ?? defaultType,
      active: feature ? isOn(feature.active) : true,
    },
  });
  const { errors, dirtyFields, isDirty } = form.formState;
  const err = (k: keyof Values) => errors[k]?.message;

  const onSubmit = form.handleSubmit((v) => {
    setFormError(null);
    const all: FeatureInput = { nameAr: v.nameAr.trim(), nameEn: v.nameEn.trim(), feature_type: v.feature_type, active: v.active };
    const body = isNew ? all : Object.fromEntries(Object.entries(all).filter(([k]) => dirtyFields[k as keyof Values]));
    save.mutate(
      { id: feature?.id ?? null, body },
      {
        onSuccess: () => {
          toast.success(isNew ? t("features.created") : t("features.saved"));
          onClose();
        },
        onError: (e) => {
          if (!applyServerErrors(e, form.setError, ["nameAr", "nameEn", "feature_type", "active"])) setFormError(errorMessage(e));
        },
      },
    );
  });

  return (
    <FormSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={isNew ? t("features.new") : t("features.editTitle")}
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
        <Field id="f-nameAr" label={t("common.nameAr")} required error={err("nameAr")}>
          <Input {...fieldA11y("f-nameAr", err("nameAr"))} dir="rtl" {...form.register("nameAr")} />
        </Field>
        <Field id="f-nameEn" label={t("common.nameEn")} required error={err("nameEn")}>
          <Input {...fieldA11y("f-nameEn", err("nameEn"))} dir="ltr" {...form.register("nameEn")} />
        </Field>
        <Field id="f-type" label={t("features.columns.type")} required error={err("feature_type")}>
          <Controller
            control={form.control}
            name="feature_type"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={!canEdit}>
                <SelectTrigger {...fieldA11y("f-type", err("feature_type"))} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FEATURE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`features.types.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <CheckboxField control={form.control} name="active" label={t("features.activeLabel")} disabled={!canEdit} />
        {!isNew && <p className="-mt-2 text-xs text-muted-foreground">{t("features.retireHint")}</p>}
      </fieldset>
      <FormError>{formError}</FormError>
    </FormSheet>
  );
}
