import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { OwnerHeader } from "@/components/layout/owner-shell";
import { OwnerUnitsView } from "@/features/owner/components/owner-units";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ownerPortal");
  return { title: t("titles.units") };
}

// O04 — My units.
export default async function Page() {
  const t = await getTranslations("ownerPortal");
  return (
    <>
      <OwnerHeader title={t("titles.units")} />
      <div className="py-3">
        <OwnerUnitsView />
      </div>
    </>
  );
}
