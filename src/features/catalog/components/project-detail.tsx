"use client";

import { Building, Copy, ExternalLink, FileText, Home, Map as MapIcon, Pencil, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { MediaGallery } from "@/components/shared/media-gallery";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/features/auth/hooks";
import { UnitStatusBadge } from "@/features/inventory/components/unit-status-badge";
import type { Building as BuildingRow, ProjectDetail as Project } from "@/features/inventory/types";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/format/dates";
import { isOn, localizedName } from "@/lib/format/localized";
import { fileName, mediaUrl } from "@/lib/format/media";
import { formatCount, formatDecimal } from "@/lib/format/money";
import { useProject } from "../hooks";
import { ActiveBadge } from "./active-badge";
import { BuildingCreateSheet } from "./building-create-sheet";
import { CloneBuildingDialog } from "./clone-building-dialog";
import { Chips, DetailCard, InfoList, StatTile } from "./detail-parts";
import { AVAILABILITY_VALUES, ProjectFormSheet } from "./project-form-sheet";

/** units_by_status may come as [{status, count}] or {status: count}. */
function statusCounts(stats: Project["stats"]): [string, number][] {
  const raw = stats?.units_by_status;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((r) => [r.status, r.count]);
  return Object.entries(raw);
}

// S08 — Project page: every project field, its stages and features, and the way into its buildings and units.
export function ProjectDetail({ id }: { id: number }) {
  const t = useTranslations();
  const locale = useLocale();
  const { can } = usePermissions();
  const canEdit = can("inventory.edit");
  const query = useProject(id);
  const [editing, setEditing] = useState(false);
  const [addingBuilding, setAddingBuilding] = useState(false);
  const [cloning, setCloning] = useState<BuildingRow | null>(null);

  const crumbs = (name?: string) => [
    { label: t("nav.groups.inventory") },
    { label: t("nav.items.projects"), href: "/projects" },
    { label: name ?? `#${id}` },
  ];

  if (query.isLoading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-16 w-full max-w-md" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-64 w-full" />
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

  const p = query.data;
  const name = localizedName(p, locale) || `#${p.id}`;
  const ref = (r: { nameAr: string | null; nameEn: string | null } | null | undefined, rid: number | null | undefined) =>
    localizedName(r, locale) || (rid ? `#${rid}` : "");
  const availability =
    p.availability && (AVAILABILITY_VALUES as readonly string[]).includes(p.availability)
      ? t(`statuses.availability.${p.availability as (typeof AVAILABILITY_VALUES)[number]}`)
      : p.availability;
  const buildings = p.buildings ?? [];
  // Cover first, then the gallery (without repeating the cover).
  const images = [p.project_image, ...(p.media ?? []).filter((m) => m !== p.project_image)].filter((m): m is string => Boolean(m));
  const documents = p.documents ?? [];
  const counts = statusCounts(p.stats);
  const mapsUrl = p.location_lang_lat ? `https://www.google.com/maps?q=${encodeURIComponent(p.location_lang_lat)}` : null;

  return (
    <>
      <PageHeader
        title={name}
        breadcrumbs={crumbs(name)}
        breadcrumbsLabel={t("common.breadcrumbs")}
        description={locale === "ar" ? (p.nameEn ?? undefined) : (p.nameAr ?? undefined)}
        meta={
          <>
            {p.status && <StatusBadge tone="info">{p.status}</StatusBadge>}
            <ActiveBadge value={p.active} />
            {isOn(p.featured) && <StatusBadge tone="sand">{t("projects.fields.featured")}</StatusBadge>}
            {p.project_code && (
              <span className="font-mono" dir="ltr">
                {p.project_code}
              </span>
            )}
          </>
        }
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/buildings?project=${p.id}`}>
                <Building data-icon="inline-start" />
                {t("projects.buildingsLink")}
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/units?project=${p.id}`}>
                <Home data-icon="inline-start" />
                {t("projects.unitsLink")}
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/units?project=${p.id}&view=plan`}>
                <MapIcon data-icon="inline-start" />
                {t("projects.sitePlan")}
              </Link>
            </Button>
            {canEdit && (
              <Button size="sm" onClick={() => setEditing(true)}>
                <Pencil data-icon="inline-start" />
                {t("common.edit")}
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label={t("projects.stats.buildings")} value={formatCount(p.stats?.buildings_count ?? buildings.length, locale)} />
        <StatTile label={t("projects.stats.units")} value={formatCount(p.stats?.units_count ?? 0, locale)} />
        <StatTile label={t("projects.fields.complete")} value={p.developing_percentage == null ? "—" : `${p.developing_percentage}%`} />
        <StatTile label={t("projects.fields.stage")} value={<span className="text-base">{ref(p.current_stage, p.current_stages) || "—"}</span>} />
      </div>

      {counts.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {counts.map(([status, count]) => (
            <Link key={status} href={`/units?project=${p.id}&status=${status}`} className="flex items-center gap-1.5 rounded-full border bg-card py-0.5 ps-1 pe-2.5 text-xs hover:border-primary/40">
              <UnitStatusBadge status={status} />
              <span className="num font-semibold">{formatCount(count, locale)}</span>
            </Link>
          ))}
        </div>
      )}

      <DetailCard title={t("projects.sections.media")}>
        <MediaGallery images={images} title={name} />
        {documents.length > 0 && (
          <div className="mt-4 grid gap-2 border-t pt-3">
            <h3 className="text-xs font-semibold text-muted-foreground">{t("projects.fields.documents")}</h3>
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {documents.map((d) => {
                const href = mediaUrl(d.url);
                return (
                  <li key={`${d.name}-${d.url}`}>
                    <a
                      href={href ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-center gap-3 rounded-lg border p-2.5 transition-colors hover:border-primary/40 hover:bg-primary/5"
                    >
                      <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                        <FileText className="size-4" />
                      </span>
                      <span className="grid min-w-0">
                        <span className="truncate text-sm font-medium">{d.name}</span>
                        <span className="truncate text-xs text-muted-foreground" dir="ltr">
                          {fileName(d.url)}
                        </span>
                      </span>
                      <ExternalLink aria-hidden className="ms-auto size-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </DetailCard>

      <DetailCard title={t("projects.sections.details")}>
        <InfoList
          items={[
            { label: t("projects.fields.availability"), value: availability },
            { label: t("projects.fields.developer"), value: ref(p.developer, p.developer_id) },
            { label: t("projects.fields.country"), value: ref(p.country, p.country_id) },
            { label: t("projects.fields.city"), value: ref(p.city, p.city_id) },
            { label: t("projects.fields.addressEn"), value: p.addressEn },
            {
              label: t("projects.fields.location"),
              value: mapsUrl && (
                <a href={mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline" dir="ltr">
                  {p.location_lang_lat}
                  <ExternalLink className="size-3" />
                </a>
              ),
            },
            { label: t("projects.fields.license"), value: p.license_num && <span dir="ltr">{p.license_num}</span> },
            { label: t("projects.fields.totalArea"), value: p.total_area && `${formatDecimal(p.total_area, locale)} m²` },
            { label: t("projects.fields.startDate"), value: formatDate(p.developing_start_date, locale) },
            { label: t("projects.fields.endDate"), value: formatDate(p.developing_end_date, locale) },
            { label: t("projects.fields.deliveryDate"), value: formatDate(p.estimated_delivery_date, locale) },
            { label: t("projects.fields.displayOrder"), value: p.display_order },
          ]}
        />
        {p.descriptionEn && (
          <p className="mt-4 border-t pt-3 text-sm leading-relaxed whitespace-pre-line" dir="ltr">
            {p.descriptionEn}
          </p>
        )}
      </DetailCard>

      <div className="grid gap-3.5 lg:grid-cols-2">
        <DetailCard title={t("projects.fields.features")}>
          <Chips items={(p.feature_items ?? []).map((f) => localizedName(f, locale) || `#${f.id}`)} empty={t("features.noneSelected")} />
        </DetailCard>
        <DetailCard title={t("projects.sections.stages")}>
          {(p.stages ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("projects.noStages")}</p>
          ) : (
            <ol className="grid gap-1.5">
              {(p.stages ?? []).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-sm">
                  <span className="font-medium">
                    {localizedName(s, locale) || `#${s.id}`}
                    {s.id === p.current_stages && (
                      <StatusBadge tone="primary" className="ms-2">
                        {t("projects.currentStage")}
                      </StatusBadge>
                    )}
                  </span>
                  <span className="num text-xs text-muted-foreground">{formatDate(s.start_date, locale)}</span>
                </li>
              ))}
            </ol>
          )}
        </DetailCard>
      </div>

      <DetailCard
        title={t("projects.buildingsTitle", { count: buildings.length })}
        actions={
          canEdit && (
            <Button size="sm" onClick={() => setAddingBuilding(true)}>
              <Plus data-icon="inline-start" />
              {t("buildings.new")}
            </Button>
          )
        }
      >
        {buildings.length === 0 ? (
          <EmptyState compact title={t("projects.noBuildings")} description={canEdit ? t("projects.noBuildingsHint") : undefined} />
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {buildings.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                <Link href={`/buildings/${b.id}`} className="grid gap-0.5 hover:text-primary">
                  <span className="font-medium" dir="ltr">
                    {t("units.buildingLabel", { code: b.building_code ?? `#${b.id}` })}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t("buildings.floorsCount", { count: b.floors_count ?? 0 })}
                  </span>
                </Link>
                <div className="flex items-center gap-1">
                  <ActiveBadge value={b.active} />
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/units?project=${p.id}&building=${b.id}`} aria-label={t("buildings.unitsOf", { code: b.building_code ?? b.id })}>
                      <Home />
                    </Link>
                  </Button>
                  {canEdit && (
                    <Button variant="ghost" size="icon" onClick={() => setCloning(b)} aria-label={t("buildings.clone.title")}>
                      <Copy />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </DetailCard>

      <ProjectFormSheet open={editing} projectId={p.id} statusSuggestions={p.status ? [p.status] : []} canEdit={canEdit} onClose={() => setEditing(false)} />
      {addingBuilding && <BuildingCreateSheet defaultProject={String(p.id)} onClose={() => setAddingBuilding(false)} />}
      {cloning && <CloneBuildingDialog building={cloning} open onOpenChange={(o) => !o && setCloning(null)} />}
    </>
  );
}
