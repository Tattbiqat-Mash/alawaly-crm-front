"use client";

import { Pencil, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { DataTable, type Column } from "@/components/shared/data-table/data-table";
import { paginationProps } from "@/components/shared/data-table/list-params";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ActiveBadge } from "@/features/catalog/components/active-badge";
import { useInventoryLookups } from "@/features/inventory/components/use-lookups";
import { formatDate } from "@/lib/format/dates";
import { localizedName } from "@/lib/format/localized";
import { cn } from "@/lib/utils";
import type { Asset, Facility } from "../api";
import { useAllFacilities, useAssets, useFacilities, useFacilitiesState } from "../hooks";
import { AssetStatusBadge } from "./facility-badges";
import { AssetSheet, FacilitySheet } from "./facility-forms";

// S28 — Facilities and assets (master / detail).
export function FacilitiesView() {
  const t = useTranslations();
  const locale = useLocale();
  const lookups = useInventoryLookups();
  const [state, setState] = useFacilitiesState();
  const facilities = useFacilities(state);
  const allFacilities = useAllFacilities();
  const assets = useAssets(state.facility, state.retired);
  const [facilitySheet, setFacilitySheet] = useState<null | "new" | Facility>(null);
  const [assetSheet, setAssetSheet] = useState<null | "new" | Asset>(null);
  const selected = facilities.data?.items.find((f) => f.id === state.facility) ?? allFacilities.data?.find((f) => f.id === state.facility);

  const facilityColumns: Column<Facility>[] = [
    {
      id: "name",
      header: t("facilities.columns.name"),
      cell: (f) => <span className={cn("font-medium", f.id === state.facility && "text-primary")}>{localizedName(f, locale) || `#${f.id}`}</span>,
    },
    {
      id: "location",
      header: t("facilities.columns.location"),
      cell: (f) => [lookups.projectName(f.project_id), lookups.buildingName(f.building_id)].filter(Boolean).join(" · ") || "—",
    },
    { id: "type", header: t("facilities.columns.type"), cell: (f) => <span dir="ltr">{f.type ?? "—"}</span> },
    { id: "active", header: t("facilities.columns.active"), cell: (f) => <ActiveBadge value={f.active} /> },
    {
      id: "edit",
      header: "",
      cell: (f) => (
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={t("facilities.editFacility")}
          onClick={(e) => {
            e.stopPropagation();
            setFacilitySheet(f);
          }}
        >
          <Pencil />
        </Button>
      ),
    },
  ];

  const assetColumns: Column<Asset>[] = [
    { id: "name", header: t("facilities.columns.asset"), cell: (a) => <span className="font-medium">{a.name}</span> },
    { id: "category", header: t("facilities.columns.category"), cell: (a) => a.category ?? "—" },
    { id: "serial", header: t("facilities.columns.serial"), cell: (a) => <span dir="ltr">{a.serial_no ?? "—"}</span> },
    { id: "installed", header: t("facilities.columns.installed"), cell: (a) => <span className="num">{formatDate(a.installed_on, locale)}</span> },
    { id: "status", header: t("facilities.columns.status"), cell: (a) => <AssetStatusBadge status={a.status} /> },
  ];

  return (
    <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-2">
      <section className="flex min-h-0 flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">{t("facilities.facilitiesHeading")}</h2>
          <Button size="sm" onClick={() => setFacilitySheet("new")}>
            <Plus data-icon="inline-start" />
            {t("facilities.newFacility")}
          </Button>
        </div>
        <DataTable
          caption={t("facilities.facilitiesHeading")}
          columns={facilityColumns}
          rows={facilities.data?.items}
          getRowId={(f) => f.id}
          getRowLabel={(f) => localizedName(f, locale) || `#${f.id}`}
          isLoading={facilities.isLoading}
          isFetching={facilities.isFetching}
          error={facilities.error}
          onRetry={() => facilities.refetch()}
          onRowClick={(f) => setState({ facility: f.id })}
          pagination={paginationProps(facilities.data?.meta, setState)}
          empty={<EmptyState compact title={t("facilities.empty")} />}
        />
      </section>
      <section className="flex min-h-0 flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium">
            {selected ? t("facilities.assetsFor", { name: localizedName(selected, locale) || `#${selected.id}` }) : t("facilities.assetsHeading")}
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Checkbox id="show-retired" checked={state.retired} onCheckedChange={(v) => setState({ retired: v === true })} />
              <Label htmlFor="show-retired" className="text-xs">
                {t("facilities.showRetired")}
              </Label>
            </div>
            <Button size="sm" variant="outline" onClick={() => setAssetSheet("new")}>
              <Plus data-icon="inline-start" />
              {t("facilities.newAsset")}
            </Button>
          </div>
        </div>
        {state.facility === null ? (
          <div className="rounded-xl border bg-card">
            <EmptyState compact title={t("facilities.pickFacility")} />
          </div>
        ) : (
          <DataTable
            caption={t("facilities.assetsHeading")}
            columns={assetColumns}
            rows={assets.data?.items}
            getRowId={(a) => a.id}
            getRowLabel={(a) => a.name}
            isLoading={assets.isLoading}
            isFetching={assets.isFetching}
            error={assets.error}
            onRetry={() => assets.refetch()}
            onRowClick={(a) => setAssetSheet(a)}
            empty={<EmptyState compact title={t("facilities.emptyAssets")} />}
          />
        )}
      </section>
      {facilitySheet !== null && (
        <FacilitySheet key={facilitySheet === "new" ? "new" : facilitySheet.id} facility={facilitySheet === "new" ? undefined : facilitySheet} onClose={() => setFacilitySheet(null)} />
      )}
      {assetSheet !== null && (
        <AssetSheet
          key={assetSheet === "new" ? "new" : assetSheet.id}
          asset={assetSheet === "new" ? undefined : assetSheet}
          facilities={allFacilities.data ?? []}
          defaultFacility={state.facility}
          onClose={() => setAssetSheet(null)}
        />
      )}
    </div>
  );
}
