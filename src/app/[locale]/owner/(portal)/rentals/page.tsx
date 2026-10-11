import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { OwnerHeader } from "@/components/layout/owner-shell";
import { OwnerRentalsView } from "@/features/owner/components/owner-inbox";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ownerPortal");
  return { title: t("titles.rentals") };
}

// O16 — Rental mandates and statements.
export default async function Page() {
  const t = await getTranslations("ownerPortal");
  return (
    <>
      <OwnerHeader title={t("titles.rentals")} backHref="/owner/more" />
      <div className="py-3">
        <OwnerRentalsView />
      </div>
    </>
  );
}
