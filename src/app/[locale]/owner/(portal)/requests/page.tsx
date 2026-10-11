import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { OwnerHeader } from "@/components/layout/owner-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { OwnerRequestsView } from "@/features/owner/components/owner-requests";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ownerPortal");
  return { title: t("titles.requests") };
}

// O13 — My requests.
export default async function Page() {
  const t = await getTranslations("ownerPortal");
  return (
    <>
      <OwnerHeader title={t("titles.requests")} />
      <div className="py-3">
        <Suspense fallback={<Skeleton className="h-60 w-full rounded-2xl" />}>
          <OwnerRequestsView />
        </Suspense>
      </div>
    </>
  );
}
