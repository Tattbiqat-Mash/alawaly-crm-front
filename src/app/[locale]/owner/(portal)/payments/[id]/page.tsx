import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OwnerHeader } from "@/components/layout/owner-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { OwnerPaymentView } from "@/features/owner/components/owner-payments";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ownerPortal");
  return { title: t("titles.payment") };
}

async function Route({ params }: { params: PageProps<"/[locale]/owner/payments/[id]">["params"] }) {
  const { id } = await params;
  const value = Number(id);
  if (!Number.isInteger(value) || value <= 0) notFound();
  return <OwnerPaymentView paymentId={value} />;
}

// O08 — Payment instructions and status. The id is read inside Suspense so the shell stays instant.
export default async function Page({ params }: PageProps<"/[locale]/owner/payments/[id]">) {
  const t = await getTranslations("ownerPortal");
  return (
    <>
      <OwnerHeader title={t("titles.payment")} backHref="/owner" />
      <div className="py-3">
        <Suspense fallback={<Skeleton className="h-60 w-full rounded-2xl" />}>
          <Route params={params} />
        </Suspense>
      </div>
    </>
  );
}
