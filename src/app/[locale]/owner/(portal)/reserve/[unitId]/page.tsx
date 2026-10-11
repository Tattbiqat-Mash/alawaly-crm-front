import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OwnerHeader } from "@/components/layout/owner-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { OwnerReserveView } from "@/features/owner/components/owner-payments";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ownerPortal");
  return { title: t("titles.reserve") };
}

async function Route({ params }: { params: PageProps<"/[locale]/owner/reserve/[unitId]">["params"] }) {
  const { unitId } = await params;
  const value = Number(unitId);
  if (!Number.isInteger(value) || value <= 0) notFound();
  return <OwnerReserveView unitId={value} />;
}

// O06 — Reserve a unit. The id is read inside Suspense so the shell stays instant.
export default async function Page({ params }: PageProps<"/[locale]/owner/reserve/[unitId]">) {
  const t = await getTranslations("ownerPortal");
  return (
    <>
      <OwnerHeader title={t("titles.reserve")} backHref="/owner" />
      <div className="py-3">
        <Suspense fallback={<Skeleton className="h-60 w-full rounded-2xl" />}>
          <Route params={params} />
        </Suspense>
      </div>
    </>
  );
}
