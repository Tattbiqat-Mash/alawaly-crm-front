import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageContainer } from "@/components/layout/admin-shell";
import { screenMetadata } from "@/components/layout/screen";
import { Skeleton } from "@/components/ui/skeleton";
import { HandoverDetail } from "@/features/handover/components/handover-detail";

export const generateMetadata = screenMetadata("handovers");

async function HandoverRoute({ params }: { params: PageProps<"/[locale]/handovers/[id]">["params"] }) {
  const { id } = await params;
  const handoverId = Number(id);
  if (!Number.isInteger(handoverId) || handoverId <= 0) notFound();
  return <HandoverDetail id={handoverId} />;
}

// S21 — Handover detail.
export default function HandoverPage({ params }: PageProps<"/[locale]/handovers/[id]">) {
  return (
    <PageContainer>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <HandoverRoute params={params} />
      </Suspense>
    </PageContainer>
  );
}
