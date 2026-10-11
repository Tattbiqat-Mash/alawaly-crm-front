import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageContainer } from "@/components/layout/admin-shell";
import { screenMetadata } from "@/components/layout/screen";
import { Skeleton } from "@/components/ui/skeleton";
import { ServiceRequestDetailView } from "@/features/service/components/service-request-detail";

export const generateMetadata = screenMetadata("serviceDesk");

async function RequestRoute({ params }: { params: PageProps<"/[locale]/service-requests/[id]">["params"] }) {
  const { id } = await params;
  const requestId = Number(id);
  if (!Number.isInteger(requestId) || requestId <= 0) notFound();
  return <ServiceRequestDetailView id={requestId} />;
}

// S25 — Service request detail.
export default function ServiceRequestPage({ params }: PageProps<"/[locale]/service-requests/[id]">) {
  return (
    <PageContainer>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <RequestRoute params={params} />
      </Suspense>
    </PageContainer>
  );
}
