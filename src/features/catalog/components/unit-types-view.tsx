"use client";

import { Info, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { DataTable, type Column } from "@/components/shared/data-table/data-table";
import { paginationProps } from "@/components/shared/data-table/list-params";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/features/auth/hooks";
import type { LookupValue, UnitType } from "@/features/inventory/types";
import { localizedName } from "@/lib/format/localized";
import { useLookup, useUnitTypesList, useUnitTypesState } from "../hooks";
import { ActiveBadge } from "./active-badge";
import { FeaturesTab } from "./features-tab";
import { UnitTypeFormSheet } from "./unit-type-form-sheet";

// Lookup tabs from wireframe S10. An unknown type simply returns an empty list.
const LOOKUP_TYPES = ["facade", "finishing", "view", "parking"] as const;
type LookupType = (typeof LOOKUP_TYPES)[number];

function LookupTable({ type }: { type: LookupType }) {
  const t = useTranslations("unitTypes");
  const query = useLookup(type);
  const columns: Column<LookupValue>[] = [
    { id: "crm", header: t("lookupColumns.crmId"), cell: (v) => <span className="num" dir="ltr">{v.crm_id ?? "—"}</span> },
    { id: "ar", header: t("lookupColumns.arabic"), cell: (v) => <span dir="rtl">{v.nameAr ?? "—"}</span> },
    { id: "en", header: t("lookupColumns.english"), cell: (v) => <span dir="ltr">{v.nameEn ?? "—"}</span> },
    { id: "active", header: t("columns.active"), cell: (v) => <ActiveBadge value={v.active} /> },
  ];
  return (
    <DataTable
      caption={t(`lookups.${type}`)}
      columns={columns}
      rows={query.data?.items}
      getRowId={(v) => v.id}
      isLoading={query.isLoading}
      isFetching={query.isFetching}
      error={query.error}
      onRetry={() => query.refetch()}
      empty={<EmptyState compact title={t("lookupEmpty")} />}
    />
  );
}

// S10 — Unit types and the feature catalogue (editable), and CRM lookups (read-only: the API has no write for them).
export function UnitTypesView() {
  const t = useTranslations();
  const locale = useLocale();
  const { can } = usePermissions();
  const canEdit = can("inventory.edit");
  const [state, setState] = useUnitTypesState();
  const list = useUnitTypesList(state);
  const [sheet, setSheet] = useState<null | "new" | UnitType>(null);

  const columns: Column<UnitType>[] = [
    {
      id: "name",
      header: t("unitTypes.columns.name"),
      cell: (u) => (
        <div className="flex flex-col">
          <span className="font-medium">{localizedName(u, locale) || `#${u.id}`}</span>
          <span className="text-xs text-muted-foreground">{locale === "ar" ? u.nameEn : u.nameAr}</span>
        </div>
      ),
    },
    { id: "crm", header: t("unitTypes.columns.crm"), cell: (u) => <span className="num" dir="ltr">{u.crm_value ?? "—"}</span> },
    { id: "active", header: t("unitTypes.columns.active"), cell: (u) => <ActiveBadge value={u.active} /> },
  ];

  return (
    <Tabs value={state.tab} onValueChange={(tab) => setState({ tab, page: 1, featureType: null })} className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
          <TabsTrigger value="types">{t("unitTypes.typesTab")}</TabsTrigger>
          <TabsTrigger value="features">{t("features.title")}</TabsTrigger>
          {LOOKUP_TYPES.map((type) => (
            <TabsTrigger key={type} value={type}>
              {t(`unitTypes.lookups.${type}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        {state.tab === "types" && canEdit && (
          <Button onClick={() => setSheet("new")}>
            <Plus data-icon="inline-start" />
            {t("unitTypes.new")}
          </Button>
        )}
      </div>
      <TabsContent value="types" className="flex min-h-0 flex-1 flex-col">
        <DataTable
          caption={t("unitTypes.typesTab")}
          columns={columns}
          rows={list.data?.items}
          getRowId={(u) => u.id}
          getRowLabel={(u) => localizedName(u, locale) || `#${u.id}`}
          isLoading={list.isLoading}
          isFetching={list.isFetching}
          error={list.error}
          onRetry={() => list.refetch()}
          onRowClick={(u) => setSheet(u)}
          pagination={paginationProps(list.data?.meta, setState)}
          empty={<EmptyState compact title={t("unitTypes.empty")} />}
        />
      </TabsContent>
      <TabsContent value="features" className="flex min-h-0 flex-1 flex-col gap-3">
        <FeaturesTab canEdit={canEdit} />
      </TabsContent>
      {LOOKUP_TYPES.map((type) => (
        <TabsContent key={type} value={type} className="flex min-h-0 flex-1 flex-col gap-3">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info aria-hidden className="size-3.5" />
            {t("unitTypes.lookupReadOnly")}
          </p>
          <LookupTable type={type} />
        </TabsContent>
      ))}
      {sheet !== null && (
        <UnitTypeFormSheet
          key={sheet === "new" ? "new" : sheet.id}
          unitType={sheet === "new" ? undefined : sheet}
          canEdit={canEdit}
          onClose={() => setSheet(null)}
        />
      )}
    </Tabs>
  );
}
