import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { PageContainer } from "@/components/layout/admin-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { UnitsActions, UnitsView } from "@/features/inventory/components/units-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("units");
  return { title: t("title") };
}

// S03 — Units. Header prerenders; the table reads URL state, so it sits behind Suspense.
export default async function UnitsPage() {
  const t = await getTranslations();
  return (
    <PageContainer fill>
      <PageHeader
        title={t("units.title")}
        description={t("units.subtitle")}
        breadcrumbs={[{ label: t("nav.groups.inventory") }, { label: t("nav.items.units") }]}
        breadcrumbsLabel={t("common.breadcrumbs")}
        actions={<UnitsActions />}
      />
      <Suspense fallback={<Skeleton className="min-h-[380px] flex-1 rounded-xl" />}>
        <UnitsView />
      </Suspense>
    </PageContainer>
  );
}
