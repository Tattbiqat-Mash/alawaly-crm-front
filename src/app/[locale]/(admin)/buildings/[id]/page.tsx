import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageContainer } from "@/components/layout/admin-shell";
import { screenMetadata } from "@/components/layout/screen";
import { Skeleton } from "@/components/ui/skeleton";
import { BuildingDetail } from "@/features/catalog/components/building-detail";

export const generateMetadata = screenMetadata("buildings");

async function BuildingDetailRoute({ params }: { params: PageProps<"/[locale]/buildings/[id]">["params"] }) {
  const { id } = await params;
  const buildingId = Number(id);
  if (!Number.isInteger(buildingId) || buildingId <= 0) notFound();
  return <BuildingDetail id={buildingId} />;
}

// S09 — Building page. The id is read inside Suspense so the shell stays instant.
export default function BuildingDetailPage({ params }: PageProps<"/[locale]/buildings/[id]">) {
  return (
    <PageContainer>
      <Suspense fallback={<Skeleton className="h-80 w-full" />}>
        <BuildingDetailRoute params={params} />
      </Suspense>
    </PageContainer>
  );
}
