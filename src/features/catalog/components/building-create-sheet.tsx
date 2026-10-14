"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Field, fieldA11y } from "@/components/shared/form/field";
import { FormSheet } from "@/components/shared/form/form-sheet";
import { applyServerErrors } from "@/components/shared/form/server-errors";
import { FormError } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProjects } from "@/features/inventory/hooks";
import { useErrorMessage } from "@/hooks/use-error-message";
import { useRouter } from "@/i18n/navigation";
import { toApiError } from "@/lib/api/errors";
import { useIdempotencyKey } from "@/lib/api/idempotency";
import { localizedName } from "@/lib/format/localized";
import { catalogApi } from "../api";
import { useCreateBuildingWithFloors, useProject, useSaveBuilding } from "../hooks";
import { FeaturePicker } from "./feature-picker";
import { FloorsEditor, highestFloor, MAX_UNITS_PER_REQUEST, rowInvalid, toFloorInputs, unitsToCreate, type FloorRow } from "./floors-editor";

const NONE = "none";

type Values = {
  project_id: string;
  stage_id: string;
  building_code: string;
  floors_count: string;
  addressAr: string;
  addressEn: string;
  unit_code_pattern: string;
};

/**
 * S09 new building. With floors: POST /buildings/with-floors creates the building, its features and
 * every unit from the chosen templates in one transaction. Without floors: a plain POST /buildings.
 */
export function BuildingCreateSheet({ defaultProject, onClose }: { defaultProject: string | null; onClose: () => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const projects = useProjects();
  const withFloors = useCreateBuildingWithFloors();
  const plain = useSaveBuilding();
  const idempotency = useIdempotencyKey();
  const [rows, setRows] = useState<FloorRow[]>([]);
  const [featureIds, setFeatureIds] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const pending = withFloors.isPending || plain.isPending;

  const schema = z.object({
    project_id: z.string().min(1, t("buildings.projectRequired")),
    stage_id: z.string(),
    building_code: z.string().trim().min(1, t("validation.required")).max(30, t("buildings.codeTooLong")),
    floors_count: z.string().trim().regex(/^\d*$/, t("validation.wholeNumber")),
    addressAr: z.string().trim().max(255),
    addressEn: z.string().trim().max(255),
    unit_code_pattern: z.string().trim().max(60),
  });
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { project_id: defaultProject ?? "", stage_id: NONE, building_code: "", floors_count: "", addressAr: "", addressEn: "", unit_code_pattern: "" },
  });
  const projectId = useWatch({ control: form.control, name: "project_id" });
  const project = useProject(projectId ? Number(projectId) : null);
  const { errors } = form.formState;
  const err = (k: keyof Values) => errors[k]?.message;
  const total = unitsToCreate(rows);

  const done = (buildingId: number, units: number) => {
    toast.success(units > 0 ? t("buildings.createdWithUnits", { count: units }) : t("buildings.created"));
    onClose();
    router.push(`/buildings/${buildingId}`);
  };
  const fail = (e: unknown) => {
    if (toApiError(e).code === "IDEMPOTENCY_CONFLICT") idempotency.renew();
    if (!applyServerErrors(e, form.setError, ["project_id", "stage_id", "building_code", "floors_count", "addressAr", "addressEn", "unit_code_pattern"]))
      setFormError(errorMessage(e));
  };

  const onSubmit = form.handleSubmit(async (v) => {
    setSubmitted(true);
    setFormError(null);
    if (rows.some(rowInvalid)) return setFormError(t("buildings.floorsEditor.incomplete"));
    if (total > MAX_UNITS_PER_REQUEST) return setFormError(t("buildings.floorsEditor.tooMany", { max: MAX_UNITS_PER_REQUEST }));

    const base = {
      project_id: Number(v.project_id),
      building_code: v.building_code.trim(),
      ...(v.stage_id !== NONE && { stage_id: Number(v.stage_id) }),
      ...(v.addressAr.trim() && { addressAr: v.addressAr.trim() }),
      ...(v.addressEn.trim() && { addressEn: v.addressEn.trim() }),
    };
    const floorsCount = Math.max(Number(v.floors_count) || 0, highestFloor(rows)) || undefined;

    if (rows.length > 0) {
      withFloors.mutate(
        {
          ...base,
          floors_count: floorsCount,
          feature_ids: featureIds,
          ...(v.unit_code_pattern.trim() && { unit_code_pattern: v.unit_code_pattern.trim() }),
          floors: toFloorInputs(rows),
        },
        { onSuccess: (res) => done(res.building_id, res.units_created), onError: fail },
      );
      return;
    }
    plain.mutate(
      { id: null, body: { ...base, ...(floorsCount !== undefined && { floors_count: floorsCount }) }, idempotencyKey: idempotency.key },
      {
        onSuccess: async (building) => {
          idempotency.renew();
          // The building exists now; a features failure is reported but does not undo it.
          if (featureIds.length > 0) await catalogApi.setBuildingFeatures(building.id, featureIds).catch((e) => toast.error(errorMessage(e)));
          done(building.id, 0);
        },
        onError: fail,
      },
    );
  });

  return (
    <FormSheet
      open
      wide
      onOpenChange={(o) => !o && onClose()}
      title={t("buildings.new")}
      description={t("buildings.newHint")}
      onSubmit={onSubmit}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 data-icon="inline-start" className="animate-spin" />}
            {total > 0 ? t("buildings.createWithUnits", { count: total }) : t("common.create")}
          </Button>
        </>
      }
    >
      <fieldset disabled={pending} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="nb-project" label={t("buildings.fields.project")} required error={err("project_id")}>
            <Controller
              control={form.control}
              name="project_id"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(next) => {
                    field.onChange(next);
                    form.setValue("stage_id", NONE);
                  }}
                >
                  <SelectTrigger {...fieldA11y("nb-project", err("project_id"))} className="w-full">
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
          <Field id="nb-stage" label={t("buildings.fields.stage")} error={err("stage_id")}>
            <Controller
              control={form.control}
              name="stage_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={!projectId}>
                  <SelectTrigger {...fieldA11y("nb-stage", err("stage_id"))} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{t("buildings.currentStageDefault")}</SelectItem>
                    {(project.data?.stages ?? []).map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {localizedName(s, locale) || `#${s.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field id="nb-code" label={t("buildings.fields.code")} required error={err("building_code")}>
            <Input {...fieldA11y("nb-code", err("building_code"))} dir="ltr" {...form.register("building_code")} />
          </Field>
          <Field id="nb-floors" label={t("buildings.fields.floors")} error={err("floors_count")} description={t("buildings.floorsCountHint")}>
            <Input {...fieldA11y("nb-floors", err("floors_count"), true)} inputMode="numeric" dir="ltr" {...form.register("floors_count")} />
          </Field>
          <Field id="nb-addressAr" label={t("buildings.fields.addressAr")} error={err("addressAr")}>
            <Input {...fieldA11y("nb-addressAr", err("addressAr"))} dir="rtl" {...form.register("addressAr")} />
          </Field>
          <Field id="nb-addressEn" label={t("buildings.fields.addressEn")} error={err("addressEn")}>
            <Input {...fieldA11y("nb-addressEn", err("addressEn"))} dir="ltr" {...form.register("addressEn")} />
          </Field>
        </div>

        <Field id="nb-features" label={t("buildings.fields.features")}>
          <FeaturePicker id="nb-features" type="building" value={featureIds} onChange={setFeatureIds} disabled={pending} />
        </Field>

        <div className="grid gap-2">
          <div>
            <h3 className="text-sm font-semibold">{t("buildings.floorsEditor.title")}</h3>
            <p className="text-xs text-muted-foreground">{t("buildings.floorsEditor.hint")}</p>
          </div>
          <FloorsEditor rows={rows} onChange={setRows} showErrors={submitted} disabled={pending} />
        </div>

        {rows.length > 0 && (
          <Field id="nb-pattern" label={t("buildings.fields.unitCodePattern")} error={err("unit_code_pattern")} description={t("buildings.unitCodePatternHint")}>
            <Input
              {...fieldA11y("nb-pattern", err("unit_code_pattern"), true)}
              dir="ltr"
              placeholder="{building}-F{floor}-U{unit}"
              className="font-mono"
              {...form.register("unit_code_pattern")}
            />
          </Field>
        )}
      </fieldset>
      <FormError>{formError}</FormError>
    </FormSheet>
  );
}
