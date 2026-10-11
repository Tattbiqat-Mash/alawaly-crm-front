"use client";

import { Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Field, fieldA11y } from "@/components/shared/form/field";
import { FormSheet } from "@/components/shared/form/form-sheet";
import { FormError } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useInventoryLookups } from "@/features/inventory/components/use-lookups";
import { useErrorMessage } from "@/hooks/use-error-message";
import { fieldErrors, toApiError } from "@/lib/api/errors";
import { useIdempotencyKey } from "@/lib/api/idempotency";
import { formatDate } from "@/lib/format/dates";
import { isOn, localizedName } from "@/lib/format/localized";
import { ASSET_STATUSES, type Asset, type Facility } from "../api";
import { useAssetHistory, useSaveAsset, useSaveFacility } from "../hooks";
import { IncidentStatusBadge, TaskStatusBadge } from "./facility-badges";

const NONE = "none";

/** Shared save flow: idempotent create, changed-only edit, field errors from VALIDATION_FAILED. */
function useSaveFlow(save: { mutate: (v: { id: number | null; body: Record<string, unknown>; key: string }, o: object) => void; isPending: boolean }, id: number | null, onDone: () => void) {
  const t = useTranslations("facilities");
  const errorMessage = useErrorMessage();
  const idempotency = useIdempotencyKey();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const submit = (body: Record<string, unknown>) => {
    setErrors({});
    setFormError(null);
    save.mutate(
      { id, body, key: idempotency.key },
      {
        onSuccess: () => {
          idempotency.renew();
          toast.success(id === null ? t("created") : t("saved"));
          onDone();
        },
        onError: (e: unknown) => {
          const err = toApiError(e);
          if (err.code === "IDEMPOTENCY_CONFLICT") idempotency.renew();
          const fields = fieldErrors(err);
          if (fields) setErrors(fields);
          else setFormError(errorMessage(err));
        },
      },
    );
  };
  return { submit, errors, formError, pending: save.isPending };
}

function SheetFooterButtons({ isNew, pending, onClose }: { isNew: boolean; pending: boolean; onClose: () => void }) {
  const t = useTranslations("common");
  return (
    <>
      <Button type="button" variant="outline" onClick={onClose}>
        {t("cancel")}
      </Button>
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 data-icon="inline-start" className="animate-spin" />}
        {isNew ? t("create") : t("save")}
      </Button>
    </>
  );
}

export function FacilitySheet({ facility, onClose }: { facility?: Facility; onClose: () => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const lookups = useInventoryLookups();
  const flow = useSaveFlow(useSaveFacility(), facility?.id ?? null, onClose);
  const [v, setV] = useState({
    project_id: facility?.project_id ? String(facility.project_id) : "",
    building_id: facility?.building_id ? String(facility.building_id) : NONE,
    name_ar: facility?.name_ar ?? "",
    name_en: facility?.name_en ?? "",
    type: facility?.type ?? "",
    active: facility ? isOn(facility.active) : true,
  });
  const [submitted, setSubmitted] = useState(false);
  const required = t("validation.required");
  const missing = (k: "project_id" | "name_ar" | "name_en") => (submitted && !v[k].trim() ? required : flow.errors[k]?.[0]);
  const buildings = lookups.buildings.filter((b) => String(b.project_id) === v.project_id);

  return (
    <FormSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={facility ? t("facilities.editFacility") : t("facilities.newFacility")}
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
        if (!v.project_id || !v.name_ar.trim() || !v.name_en.trim()) return;
        flow.submit({
          project_id: Number(v.project_id),
          building_id: v.building_id === NONE ? null : Number(v.building_id),
          name_ar: v.name_ar.trim(),
          name_en: v.name_en.trim(),
          type: v.type.trim() || null,
          active: v.active,
        });
      }}
      footer={<SheetFooterButtons isNew={!facility} pending={flow.pending} onClose={onClose} />}
    >
      <fieldset disabled={flow.pending} className="grid gap-4">
        <Field id="fc-project" label={t("facilities.fields.project")} required error={missing("project_id")}>
          <Select value={v.project_id} onValueChange={(project_id) => setV({ ...v, project_id, building_id: NONE })}>
            <SelectTrigger {...fieldA11y("fc-project", missing("project_id"))} className="w-full">
              <SelectValue placeholder={t("facilities.fields.project")} />
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
        <Field id="fc-building" label={t("facilities.fields.building")}>
          <Select value={v.building_id} onValueChange={(building_id) => setV({ ...v, building_id })} disabled={!v.project_id}>
            <SelectTrigger id="fc-building" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>—</SelectItem>
              {buildings.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {lookups.buildingName(b.id)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id="fc-name-ar" label={t("facilities.fields.nameAr")} required error={missing("name_ar")}>
          <Input {...fieldA11y("fc-name-ar", missing("name_ar"))} dir="rtl" value={v.name_ar} onChange={(e) => setV({ ...v, name_ar: e.target.value })} />
        </Field>
        <Field id="fc-name-en" label={t("facilities.fields.nameEn")} required error={missing("name_en")}>
          <Input {...fieldA11y("fc-name-en", missing("name_en"))} dir="ltr" value={v.name_en} onChange={(e) => setV({ ...v, name_en: e.target.value })} />
        </Field>
        <Field id="fc-type" label={t("facilities.fields.type")} description={t("facilities.fields.typeHint")}>
          <Input id="fc-type" dir="ltr" value={v.type} onChange={(e) => setV({ ...v, type: e.target.value })} />
        </Field>
        <div className="flex items-center gap-2">
          <Checkbox id="fc-active" checked={v.active} onCheckedChange={(c) => setV({ ...v, active: c === true })} />
          <Label htmlFor="fc-active">{t("facilities.fields.active")}</Label>
        </div>
      </fieldset>
      <FormError>{flow.formError}</FormError>
    </FormSheet>
  );
}

function HistoryList({ title, children, empty }: { title: string; children: ReactNode[]; empty: string }) {
  return (
    <div className="grid gap-1.5">
      <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      {children.length === 0 ? <p className="text-xs text-muted-foreground">{empty}</p> : <ul className="divide-y rounded-lg border text-sm">{children}</ul>}
    </div>
  );
}

export function AssetSheet({ asset, facilities, defaultFacility, onClose }: { asset?: Asset; facilities: Facility[]; defaultFacility: number | null; onClose: () => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const flow = useSaveFlow(useSaveAsset(), asset?.id ?? null, onClose);
  const history = useAssetHistory(asset?.id ?? null);
  const [v, setV] = useState({
    facility_id: asset ? String(asset.facility_id) : defaultFacility ? String(defaultFacility) : "",
    name: asset?.name ?? "",
    category: asset?.category ?? "",
    serial_no: asset?.serial_no ?? "",
    installed_on: asset?.installed_on ?? "",
    status: asset?.status ?? "in_service",
  });
  const [submitted, setSubmitted] = useState(false);
  const required = t("validation.required");
  const missing = (k: "facility_id" | "name") => (submitted && !v[k].trim() ? required : flow.errors[k]?.[0]);

  return (
    <FormSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={asset ? `${t("facilities.editAsset")} · ${asset.name}` : t("facilities.newAsset")}
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
        if (!v.facility_id || !v.name.trim()) return;
        const body = {
          facility_id: Number(v.facility_id),
          name: v.name.trim(),
          category: v.category.trim() || null,
          serial_no: v.serial_no.trim() || null,
          installed_on: v.installed_on || null,
          ...(asset ? { status: v.status } : {}),
        };
        flow.submit(body);
      }}
      footer={<SheetFooterButtons isNew={!asset} pending={flow.pending} onClose={onClose} />}
    >
      <fieldset disabled={flow.pending} className="grid gap-4">
        <Field id="as-facility" label={t("facilities.fields.facility")} required error={missing("facility_id")}>
          <Select value={v.facility_id} onValueChange={(facility_id) => setV({ ...v, facility_id })} disabled={Boolean(asset)}>
            <SelectTrigger {...fieldA11y("as-facility", missing("facility_id"))} className="w-full">
              <SelectValue placeholder={t("facilities.fields.facility")} />
            </SelectTrigger>
            <SelectContent>
              {facilities.map((f) => (
                <SelectItem key={f.id} value={String(f.id)}>
                  {localizedName(f, locale) || `#${f.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id="as-name" label={t("facilities.fields.name")} required error={missing("name")}>
          <Input {...fieldA11y("as-name", missing("name"))} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="as-category" label={t("facilities.fields.category")}>
            <Input id="as-category" dir="ltr" value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })} />
          </Field>
          <Field id="as-serial" label={t("facilities.fields.serial")}>
            <Input id="as-serial" dir="ltr" value={v.serial_no} onChange={(e) => setV({ ...v, serial_no: e.target.value })} />
          </Field>
          <Field id="as-installed" label={t("facilities.fields.installed")}>
            <Input id="as-installed" type="date" dir="ltr" value={v.installed_on} onChange={(e) => setV({ ...v, installed_on: e.target.value })} />
          </Field>
          {asset && (
            <Field id="as-status" label={t("facilities.fields.status")}>
              <Select value={v.status} onValueChange={(status) => setV({ ...v, status })}>
                <SelectTrigger id="as-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`statuses.asset.${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        </div>
      </fieldset>
      <FormError>{flow.formError}</FormError>

      {asset && (
        <section className="grid gap-3 border-t pt-4">
          <h2 className="text-sm font-medium">{t("facilities.history.title")}</h2>
          {history.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <>
              <HistoryList title={t("facilities.history.tasks")} empty={t("facilities.history.empty")}>
                {(history.data?.tasks ?? []).map((task) => (
                  <li key={task.id} className="flex items-center justify-between gap-2 px-3 py-1.5">
                    <span className="num">{formatDate(task.due_on, locale)}</span>
                    <TaskStatusBadge status={task.status} />
                  </li>
                ))}
              </HistoryList>
              <HistoryList title={t("facilities.history.incidents")} empty={t("facilities.history.empty")}>
                {(history.data?.incidents ?? []).map((incident) => (
                  <li key={incident.id} className="flex items-center justify-between gap-2 px-3 py-1.5">
                    <span className="truncate">{incident.title}</span>
                    <IncidentStatusBadge status={incident.status} />
                  </li>
                ))}
              </HistoryList>
            </>
          )}
        </section>
      )}
    </FormSheet>
  );
}
