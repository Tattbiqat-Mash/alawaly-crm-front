import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OwnerHeader } from "@/components/layout/owner-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { OwnerHandoverView } from "@/features/owner/components/owner-purchase";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ownerPortal");
  return { title: t("titles.handover") };
}

async function Route({ params }: { params: PageProps<"/[locale]/owner/handover/[saleId]">["params"] }) {
  const { saleId } = await params;
  const value = Number(saleId);
  if (!Number.isInteger(value) || value <= 0) notFound();
  return <OwnerHandoverView saleId={value} />;
}

// O10 — Handover. The id is read inside Suspense so the shell stays instant.
export default async function Page({ params }: PageProps<"/[locale]/owner/handover/[saleId]">) {
  const t = await getTranslations("ownerPortal");
  return (
    <>
      <OwnerHeader title={t("titles.handover")} backHref="/owner" />
      <div className="py-3">
        <Suspense fallback={<Skeleton className="h-60 w-full rounded-2xl" />}>
          <Route params={params} />
        </Suspense>
      </div>
    </>
  );
}
