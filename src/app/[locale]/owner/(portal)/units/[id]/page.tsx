import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OwnerHeader } from "@/components/layout/owner-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { OwnerUnitDetail } from "@/features/owner/components/owner-units";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ownerPortal");
  return { title: t("titles.unit") };
}

async function Route({ params }: { params: PageProps<"/[locale]/owner/units/[id]">["params"] }) {
  const { id } = await params;
  const value = Number(id);
  if (!Number.isInteger(value) || value <= 0) notFound();
  return <OwnerUnitDetail id={value} />;
}

// O05 — Unit detail. The id is read inside Suspense so the shell stays instant.
export default async function Page({ params }: PageProps<"/[locale]/owner/units/[id]">) {
  const t = await getTranslations("ownerPortal");
  return (
    <>
      <OwnerHeader title={t("titles.unit")} backHref="/owner/units" />
      <div className="py-3">
        <Suspense fallback={<Skeleton className="h-60 w-full rounded-2xl" />}>
          <Route params={params} />
        </Suspense>
      </div>
    </>
  );
}
