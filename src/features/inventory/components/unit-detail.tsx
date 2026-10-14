"use client";

import { ArrowLeftRight, BadgeDollarSign, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/features/auth/hooks";
import { useUnit } from "../hooks";
import { ChangeStatusDialog } from "./change-status-dialog";
import { PriceChangeDialog } from "./price-change-dialog";
import { UnitDetailsForm } from "./unit-details-form";
import { UnitFeaturesCard } from "./unit-features-card";
import { UnitStatusBadge } from "./unit-status-badge";
import { AvailabilityCard, EligibilityTab, OwnershipTab, PricesTab, StatusHistoryTab } from "./unit-tabs";
import { useInventoryLookups } from "./use-lookups";

const TABS = ["details", "statusHistory", "prices", "ownership", "eligibility"] as const;

// S04 — Unit detail.
export function UnitDetail({ id }: { id: number }) {
  const t = useTranslations();
  const { can } = usePermissions();
  const query = useUnit(id);
  const lookups = useInventoryLookups();
  const [tab, setTab] = useQueryState("tab", parseAsStringLiteral(TABS).withDefault("details").withOptions({ history: "replace" }));
  const [statusOpen, setStatusOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);

  const breadcrumbs = (number?: string) => [
    { label: t("nav.groups.inventory") },
    { label: t("nav.items.units"), href: "/units" },
    { label: number ?? `#${id}` },
  ];

  if (query.isLoading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-16 w-full max-w-md" />
        <Skeleton className="h-10 w-full max-w-lg" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }
  if (query.error || !query.data) {
    return (
      <>
        <PageHeader title={`#${id}`} breadcrumbs={breadcrumbs()} breadcrumbsLabel={t("common.breadcrumbs")} />
        <div className="rounded-xl border bg-card">
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        </div>
      </>
    );
  }

  const data = query.data;
  const unit = data.unit;
  const number = unit.unit_number ?? `#${unit.id}`;

  return (
    <>
      <PageHeader
        title={t("units.detail.titleNumber", { number })}
        breadcrumbs={breadcrumbs(number)}
        breadcrumbsLabel={t("common.breadcrumbs")}
        description={[lookups.projectName(unit.project_id), lookups.buildingName(unit.building_id), lookups.typeName(unit.unit_type_id)]
          .filter(Boolean)
          .join(" · ")}
        meta={
          <>
            <UnitStatusBadge status={unit.status} />
            {unit.unit_code && <span>{t("units.detail.code", { code: unit.unit_code })}</span>}
            {unit.crm_unit_id && <span dir="ltr">{t("units.detail.crm", { id: unit.crm_unit_id })}</span>}
            <span className="num">{t("units.detail.version", { version: unit.version })}</span>
          </>
        }
        actions={
          <>
            {can("pricing.request") && (
              <Button variant="outline" size="sm" onClick={() => setPriceOpen(true)}>
                <BadgeDollarSign data-icon="inline-start" />
                {t("units.detail.requestPrice")}
              </Button>
            )}
            {can("inventory.status") && (
              <Button size="sm" onClick={() => setStatusOpen(true)}>
                <ArrowLeftRight data-icon="inline-start" />
                {t("units.detail.changeStatus")}
              </Button>
            )}
          </>
        }
      />

      {(unit.status === "reserved" || unit.status === "sold") && (
        <p className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
          <Info aria-hidden className="size-3.5 shrink-0" />
          {unit.status === "reserved" ? t("units.detail.linkedReservation") : t("units.detail.linkedSale")}
        </p>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as (typeof TABS)[number])} className="gap-3">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
          {TABS.map((key) => (
            <TabsTrigger key={key} value={key} className="text-xs">
              {t(`units.tabs.${key}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="details">
          <div className="grid gap-3.5 xl:grid-cols-[1fr_330px]">
            <section className="rounded-xl border bg-card p-3.5 sm:p-4 md:p-5">
              <UnitDetailsForm data={data} />
            </section>
            <div className="grid content-start gap-3.5">
              <AvailabilityCard unitId={unit.id} />
              <UnitFeaturesCard unitId={unit.id} />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="statusHistory">
          <StatusHistoryTab unitId={unit.id} />
        </TabsContent>
        <TabsContent value="prices">
          <PricesTab unitId={unit.id} />
        </TabsContent>
        <TabsContent value="ownership">
          <OwnershipTab unitId={unit.id} />
        </TabsContent>
        <TabsContent value="eligibility">
          <EligibilityTab unitId={unit.id} />
        </TabsContent>
      </Tabs>

      {can("inventory.status") && <ChangeStatusDialog data={data} open={statusOpen} onOpenChange={setStatusOpen} />}
      {can("pricing.request") && <PriceChangeDialog unit={unit} open={priceOpen} onOpenChange={setPriceOpen} />}
    </>
  );
}
