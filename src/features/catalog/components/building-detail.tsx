"use client";

import { Copy, Home, Layers, Loader2, Map as MapIcon, Pencil, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { FormSheet } from "@/components/shared/form/form-sheet";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, FormError } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isUnitStatus } from "@/config/statuses";
import { usePermissions } from "@/features/auth/hooks";
import { AddUnitDialog, type AddUnitPreset } from "@/features/inventory/components/add-unit-dialog";
import { windowTone } from "@/features/inventory/components/site-plan/unit-tone";
import { useInventoryLookups } from "@/features/inventory/components/use-lookups";
import type { Building, Feature } from "@/features/inventory/types";
import { useErrorMessage } from "@/hooks/use-error-message";
import { Link } from "@/i18n/navigation";
import { localizedField } from "@/lib/format/localized";
import { cn } from "@/lib/utils";
import { useAddFloorTemplates, useBuilding, useBuildingFeatures, useFloorLayout, useSetBuildingFeatures } from "../hooks";
import { ActiveBadge } from "./active-badge";
import { BuildingFormSheet } from "./building-form-sheet";
import { CloneBuildingDialog } from "./clone-building-dialog";
import { DetailCard, InfoList } from "./detail-parts";
import { FeaturePicker } from "./feature-picker";
import { FloorsEditor, MAX_UNITS_PER_REQUEST, rowInvalid, toFloorInputs, unitsToCreate, type FloorRow } from "./floors-editor";

// S09 — Building page: its data and features, and every floor with the units placed on it by template.
export function BuildingDetail({ id }: { id: number }) {
  const t = useTranslations();
  const locale = useLocale();
  const { can } = usePermissions();
  const canEdit = can("inventory.edit");
  const lookups = useInventoryLookups();
  const query = useBuilding(id);
  const [editing, setEditing] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [addingFloors, setAddingFloors] = useState(false);
  const [addUnit, setAddUnit] = useState<AddUnitPreset | null>(null);

  const crumbs = (code?: string) => [
    { label: t("nav.groups.inventory") },
    { label: t("nav.items.buildings"), href: "/buildings" },
    { label: code ?? `#${id}` },
  ];

  if (query.isLoading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-16 w-full max-w-md" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }
  if (query.error || !query.data) {
    return (
      <>
        <PageHeader title={`#${id}`} breadcrumbs={crumbs()} breadcrumbsLabel={t("common.breadcrumbs")} />
        <div className="rounded-xl border bg-card">
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        </div>
      </>
    );
  }

  const b = query.data;
  const code = b.building_code ?? `#${b.id}`;
  const unitsHref = `/units?${b.project_id ? `project=${b.project_id}&` : ""}building=${b.id}`;

  return (
    <>
      <PageHeader
        title={t("units.buildingLabel", { code })}
        breadcrumbs={crumbs(code)}
        breadcrumbsLabel={t("common.breadcrumbs")}
        description={
          b.project_id ? (
            <Link href={`/projects/${b.project_id}`} className="hover:text-primary hover:underline">
              {lookups.projectName(b.project_id)}
            </Link>
          ) : undefined
        }
        meta={<ActiveBadge value={b.active} />}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href={unitsHref}>
                <Home data-icon="inline-start" />
                {t("projects.unitsLink")}
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`${unitsHref}&view=plan`}>
                <MapIcon data-icon="inline-start" />
                {t("projects.sitePlan")}
              </Link>
            </Button>
            {canEdit && (
              <>
                <Button variant="outline" size="sm" onClick={() => setCloning(true)}>
                  <Copy data-icon="inline-start" />
                  {t("buildings.clone.title")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Pencil data-icon="inline-start" />
                  {t("common.edit")}
                </Button>
                <Button size="sm" onClick={() => setAddingFloors(true)}>
                  <Layers data-icon="inline-start" />
                  {t("buildings.addTemplates")}
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="grid gap-3.5 xl:grid-cols-[1fr_380px]">
        <DetailCard title={t("buildings.detailsTitle")}>
          <InfoList
            items={[
              { label: t("buildings.fields.project"), value: lookups.projectName(b.project_id) },
              { label: t("buildings.fields.floors"), value: b.floors_count },
              { label: t("buildings.columns.address"), value: localizedField(b, "address", locale) },
            ]}
          />
        </DetailCard>
        <BuildingFeatures buildingId={b.id} canEdit={canEdit} />
      </div>

      <FloorsCard building={b} canEdit={canEdit} onAddUnit={(floor) => setAddUnit({ projectId: b.project_id, buildingId: b.id, floor })} />

      {editing && <BuildingFormSheet building={b} defaultProject={null} canEdit={canEdit} onClose={() => setEditing(false)} />}
      {cloning && <CloneBuildingDialog building={b} open onOpenChange={(o) => !o && setCloning(false)} />}
      {addingFloors && <FloorTemplatesSheet buildingId={b.id} onClose={() => setAddingFloors(false)} />}
      <AddUnitDialog open={addUnit !== null} onOpenChange={(o) => !o && setAddUnit(null)} preset={addUnit ?? {}} />
    </>
  );
}

function BuildingFeatures({ buildingId, canEdit }: { buildingId: number; canEdit: boolean }) {
  const t = useTranslations();
  const errorMessage = useErrorMessage();
  const query = useBuildingFeatures(buildingId);
  const save = useSetBuildingFeatures(buildingId);
  const [draft, setDraft] = useState<number[] | null>(null);
  const current = (query.data ?? []).map((f) => f.id);
  const value = draft ?? current;
  const changed = draft !== null && (draft.length !== current.length || draft.some((fid) => !current.includes(fid)));

  return (
    <DetailCard
      title={t("buildings.fields.features")}
      actions={
        changed && (
          <>
            <Button variant="ghost" size="sm" onClick={() => setDraft(null)} disabled={save.isPending}>
              {t("common.cancel")}
            </Button>
            <Button
              size="sm"
              disabled={save.isPending}
              onClick={() =>
                save.mutate(value, {
                  onSuccess: () => {
                    setDraft(null);
                    toast.success(t("features.savedOn"));
                  },
                  onError: (e) => toast.error(errorMessage(e)),
                })
              }
            >
              {save.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {t("common.save")}
            </Button>
          </>
        )
      }
    >
      {query.isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : query.error ? (
        <ErrorState compact error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <FeaturePicker id="building-features" type="building" value={value} onChange={setDraft} known={query.data as Feature[]} disabled={!canEdit || save.isPending} />
      )}
    </DetailCard>
  );
}

function FloorsCard({ building, canEdit, onAddUnit }: { building: Building; canEdit: boolean; onAddUnit: (floor: number) => void }) {
  const t = useTranslations();
  const layout = useFloorLayout(building.id);
  // Top floor first, as the building stands.
  const floors = [...(layout.data?.floors ?? [])].sort((a, b) => b.floor_num - a.floor_num);

  return (
    <DetailCard title={t("buildings.floorsTitle")}>
      {layout.isLoading ? (
        <div className="grid gap-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : layout.error ? (
        <ErrorState compact error={layout.error} onRetry={() => layout.refetch()} />
      ) : floors.length === 0 ? (
        <EmptyState compact title={t("buildings.noFloors")} description={canEdit ? t("buildings.noFloorsHint") : undefined} />
      ) : (
        <ol className="grid gap-2">
          {floors.map((floor) => {
            const units = floor.templates.reduce((n, g) => n + g.units_count, 0);
            return (
              <li key={floor.floor_num} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[7rem_1fr_auto] sm:items-start">
                <div className="grid">
                  <span className="text-sm font-semibold">{t("buildings.floorLabel", { floor: floor.floor_num })}</span>
                  <span className="num text-xs text-muted-foreground">{t("buildings.unitsCount", { count: units })}</span>
                </div>
                {floor.templates.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t("buildings.emptyFloor")}</p>
                ) : (
                  <div className="grid gap-2">
                    {floor.templates.map((group) => (
                      <div key={group.template_id ?? "none"} className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs" dir="ltr">
                          {group.style_code ?? t("buildings.noTemplate")} ×{group.units_count}
                        </span>
                        {group.units.map((u) => (
                          <Link
                            key={u.id}
                            href={`/units/${u.id}`}
                            title={[u.unit_code, isUnitStatus(u.status) ? t(`statuses.unit.${u.status}`) : u.status].filter(Boolean).join(" · ")}
                            className={cn("num rounded-md border px-1.5 py-0.5 text-xs", windowTone[isUnitStatus(u.status) ? u.status : "unknown"])}
                          >
                            {u.unit_number ?? `#${u.id}`}
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
                {canEdit && (
                  <Button variant="ghost" size="sm" onClick={() => onAddUnit(floor.floor_num)}>
                    <Plus data-icon="inline-start" />
                    {t("units.add.short")}
                  </Button>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </DetailCard>
  );
}

/** POST /buildings/{id}/floor-templates: numbering continues after the highest unit on each floor. */
function FloorTemplatesSheet({ buildingId, onClose }: { buildingId: number; onClose: () => void }) {
  const t = useTranslations();
  const errorMessage = useErrorMessage();
  const add = useAddFloorTemplates(buildingId);
  const [rows, setRows] = useState<FloorRow[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const total = unitsToCreate(rows);

  const submit = () => {
    setSubmitted(true);
    setError(null);
    if (rows.length === 0) return setError(t("buildings.floorsEditor.empty"));
    if (rows.some(rowInvalid)) return setError(t("buildings.floorsEditor.incomplete"));
    if (total > MAX_UNITS_PER_REQUEST) return setError(t("buildings.floorsEditor.tooMany", { max: MAX_UNITS_PER_REQUEST }));
    add.mutate(toFloorInputs(rows), {
      onSuccess: (res) => {
        toast.success(t("buildings.unitsAdded", { count: res.units_created }));
        onClose();
      },
      onError: (e) => setError(errorMessage(e)),
    });
  };

  return (
    <FormSheet
      open
      wide
      onOpenChange={(o) => !o && !add.isPending && onClose()}
      title={t("buildings.addTemplates")}
      description={t("buildings.addTemplatesHint")}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={add.isPending}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={add.isPending}>
            {add.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
            {t("buildings.createWithUnits", { count: total })}
          </Button>
        </>
      }
    >
      <FloorsEditor rows={rows} onChange={setRows} showErrors={submitted} disabled={add.isPending} />
      <FormError>{error}</FormError>
    </FormSheet>
  );
}
