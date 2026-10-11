import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageContainer } from "@/components/layout/admin-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { UnitDetail } from "@/features/inventory/components/unit-detail";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("units");
  return { title: t("title") };
}

async function UnitDetailRoute({ params }: { params: PageProps<"/[locale]/units/[id]">["params"] }) {
  const { id } = await params;
  const unitId = Number(id);
  if (!Number.isInteger(unitId) || unitId <= 0) notFound();
  return <UnitDetail id={unitId} />;
}

// S04 — Unit detail. The id is read inside Suspense so the shell stays instant.
export default function UnitDetailPage({ params }: PageProps<"/[locale]/units/[id]">) {
  return (
    <PageContainer>
      <Suspense fallback={<Skeleton className="h-80 w-full" />}>
        <UnitDetailRoute params={params} />
      </Suspense>
    </PageContainer>
  );
}
