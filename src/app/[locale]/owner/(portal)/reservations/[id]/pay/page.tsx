import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OwnerHeader } from "@/components/layout/owner-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { OwnerReservationPayView } from "@/features/owner/components/owner-payments";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ownerPortal");
  return { title: t("titles.reservationPay") };
}

async function Route({ params }: { params: PageProps<"/[locale]/owner/reservations/[id]/pay">["params"] }) {
  const { id } = await params;
  const value = Number(id);
  if (!Number.isInteger(value) || value <= 0) notFound();
  return <OwnerReservationPayView reservationId={value} />;
}

// O08 — Reservation fee payment. The id is read inside Suspense so the shell stays instant.
export default async function Page({ params }: PageProps<"/[locale]/owner/reservations/[id]/pay">) {
  const t = await getTranslations("ownerPortal");
  return (
    <>
      <OwnerHeader title={t("titles.reservationPay")} backHref="/owner/reservations" />
      <div className="py-3">
        <Suspense fallback={<Skeleton className="h-60 w-full rounded-2xl" />}>
          <Route params={params} />
        </Suspense>
      </div>
    </>
  );
}
