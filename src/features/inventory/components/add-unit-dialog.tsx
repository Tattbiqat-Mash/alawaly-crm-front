"use client";

import { Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Field, fieldA11y } from "@/components/shared/form/field";
import { FormError } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { templateLabel } from "@/features/catalog/components/floors-editor";
import { useLookup, useTemplateOptions } from "@/features/catalog/hooks";
import { useErrorMessage } from "@/hooks/use-error-message";
import { useRouter } from "@/i18n/navigation";
import { localizedName } from "@/lib/format/localized";
import { useCreateUnitsFromTemplate } from "../hooks";
import { useInventoryLookups } from "./use-lookups";

const NONE = "none";

export type AddUnitPreset = { projectId?: number | null; buildingId?: number | null; floor?: number | null; templateId?: number | null };

/**
 * New unit = a unit template (the shared data) + the unit's own details, placed on one floor of a
 * building: POST /unit-templates/{id}/units. Not idempotent, so the submit is disabled while it runs.
 */
export function AddUnitDialog({ open, onOpenChange, preset = {} }: { open: boolean; onOpenChange: (o: boolean) => void; preset?: AddUnitPreset }) {
  return open ? <AddUnitForm onOpenChange={onOpenChange} preset={preset} /> : null;
}

function AddUnitForm({ onOpenChange, preset }: { onOpenChange: (o: boolean) => void; preset: AddUnitPreset }) {
  const t = useTranslations("units.add");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");
  const locale = useLocale();
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const lookups = useInventoryLookups();
  const templates = useTemplateOptions();
  const facades = useLookup("facade");
  const create = useCreateUnitsFromTemplate();

  const presetBuilding = lookups.buildings.find((b) => b.id === preset.buildingId);
  const [projectId, setProjectId] = useState(String(preset.projectId ?? presetBuilding?.project_id ?? ""));
  const [buildingId, setBuildingId] = useState(preset.buildingId ? String(preset.buildingId) : "");
  const [templateId, setTemplateId] = useState(preset.templateId ? String(preset.templateId) : "");
  const [floor, setFloor] = useState(preset.floor != null ? String(preset.floor) : "");
  const [number, setNumber] = useState("");
  const [code, setCode] = useState("");
  const [deed, setDeed] = useState("");
  const [facade, setFacade] = useState(NONE);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildings = lookups.buildings.filter((b) => !projectId || String(b.project_id) === projectId);
  const building = lookups.buildings.find((b) => String(b.id) === buildingId);
  const suggestedCode = building?.building_code && /^-?\d+$/.test(floor) && number.trim() ? `${building.building_code}-F${floor}-U${number.trim()}` : "";

  const required = tv("required");
  const errors = {
    building: submitted && !buildingId ? required : undefined,
    template: submitted && !templateId ? required : undefined,
    floor: submitted && !/^-?\d+$/.test(floor) ? t("floorInvalid") : undefined,
    number: submitted && !number.trim() ? required : undefined,
    code: submitted && !(code.trim() || suggestedCode) ? required : undefined,
  };

  const close = (next: boolean) => {
    if (!next && create.isPending) return;
    onOpenChange(next);
  };

  const submit = () => {
    setSubmitted(true);
    setError(null);
    if (!buildingId || !templateId || !/^-?\d+$/.test(floor) || !number.trim() || !(code.trim() || suggestedCode)) return;
    create.mutate(
      {
        templateId: Number(templateId),
        body: {
          building_id: Number(buildingId),
          units: [
            {
              unit_code: code.trim() || suggestedCode,
              unit_number: number.trim(),
              floor_num: Number(floor),
              ...(deed.trim() && { unit_deed_no: deed.trim() }),
              ...(facade !== NONE && { facade_id: Number(facade) }),
            },
          ],
        },
      },
      {
        onSuccess: ({ unit_ids }) => {
          const id = unit_ids[0];
          toast.success(t("created"), id ? { action: { label: t("open"), onClick: () => router.push(`/units/${id}`) } } : undefined);
          onOpenChange(false);
        },
        onError: (e) => setError(errorMessage(e)),
      },
    );
  };

  return (
    <Dialog open onOpenChange={close}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <form
          id="add-unit"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <fieldset disabled={create.isPending} className="grid gap-4 sm:grid-cols-2">
            <Field id="au-template" label={t("template")} required error={errors.template} className="sm:col-span-2" description={t("templateHint")}>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger {...fieldA11y("au-template", errors.template, true)} className="w-full">
                  <SelectValue placeholder={t("chooseTemplate")} />
                </SelectTrigger>
                <SelectContent>
                  {(templates.data ?? []).map((tpl) => (
                    <SelectItem key={tpl.id} value={String(tpl.id)}>
                      {templateLabel(tpl, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="au-project" label={t("project")}>
              <Select
                value={projectId}
                onValueChange={(v) => {
                  setProjectId(v);
                  setBuildingId("");
                }}
              >
                <SelectTrigger id="au-project" className="w-full">
                  <SelectValue placeholder={t("anyProject")} />
                </SelectTrigger>
                <SelectContent>
                  {lookups.projects.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {localizedName(p, locale) || `#${p.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="au-building" label={t("building")} required error={errors.building}>
              <Select value={buildingId} onValueChange={setBuildingId}>
                <SelectTrigger {...fieldA11y("au-building", errors.building)} className="w-full">
                  <SelectValue placeholder={t("chooseBuilding")} />
                </SelectTrigger>
                <SelectContent>
                  {buildings.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {lookups.buildingName(b.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="au-floor" label={t("floor")} required error={errors.floor}>
              <Input {...fieldA11y("au-floor", errors.floor)} value={floor} onChange={(e) => setFloor(e.target.value)} inputMode="numeric" dir="ltr" />
            </Field>
            <Field id="au-number" label={t("number")} required error={errors.number}>
              <Input {...fieldA11y("au-number", errors.number)} value={number} onChange={(e) => setNumber(e.target.value)} dir="ltr" />
            </Field>
            <Field id="au-code" label={t("code")} required error={errors.code} description={suggestedCode && !code ? t("codeSuggested", { code: suggestedCode }) : undefined}>
              <Input
                {...fieldA11y("au-code", errors.code, Boolean(suggestedCode && !code))}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={suggestedCode}
                dir="ltr"
                className="font-mono"
              />
            </Field>
            <Field id="au-deed" label={t("deed")}>
              <Input id="au-deed" value={deed} onChange={(e) => setDeed(e.target.value)} dir="ltr" />
            </Field>
            <Field id="au-facade" label={t("facade")} className="sm:col-span-2">
              <Select value={facade} onValueChange={setFacade}>
                <SelectTrigger id="au-facade" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {(facades.data?.items ?? []).map((f) => (
                    <SelectItem key={f.id} value={String(f.id)}>
                      {localizedName(f, locale) || f.crm_id || `#${f.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </fieldset>
          <FormError>{error}</FormError>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => close(false)} disabled={create.isPending}>
            {tc("cancel")}
          </Button>
          <Button type="submit" form="add-unit" disabled={create.isPending}>
            {create.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
            {t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
