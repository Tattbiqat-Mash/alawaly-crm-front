import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { OwnerHeader } from "@/components/layout/owner-shell";
import { OwnerReservationsView } from "@/features/owner/components/owner-payments";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ownerPortal");
  return { title: t("titles.reservations") };
}

// O07 — My reservations.
export default async function Page() {
  const t = await getTranslations("ownerPortal");
  return (
    <>
      <OwnerHeader title={t("titles.reservations")} backHref="/owner/more" />
      <div className="py-3">
        <OwnerReservationsView />
      </div>
    </>
  );
}
