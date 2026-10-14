import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageContainer } from "@/components/layout/admin-shell";
import { screenMetadata } from "@/components/layout/screen";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectDetail } from "@/features/catalog/components/project-detail";

export const generateMetadata = screenMetadata("projects");

async function ProjectDetailRoute({ params }: { params: PageProps<"/[locale]/projects/[id]">["params"] }) {
  const { id } = await params;
  const projectId = Number(id);
  if (!Number.isInteger(projectId) || projectId <= 0) notFound();
  return <ProjectDetail id={projectId} />;
}

// S08 — Project page. The id is read inside Suspense so the shell stays instant.
export default function ProjectDetailPage({ params }: PageProps<"/[locale]/projects/[id]">) {
  return (
    <PageContainer>
      <Suspense fallback={<Skeleton className="h-80 w-full" />}>
        <ProjectDetailRoute params={params} />
      </Suspense>
    </PageContainer>
  );
}
