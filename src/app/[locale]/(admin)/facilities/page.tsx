import { getTranslations } from "next-intl/server";
import { Screen, screenMetadata } from "@/components/layout/screen";
import { FacilitiesView } from "@/features/facilities/components/facilities-view";

export const generateMetadata = screenMetadata("facilities");

// S28 — Facilities and assets.
export default async function FacilitiesPage() {
  const t = await getTranslations();
  return (
    <Screen
      fill
      title={t("facilities.title")}
      description={t("facilities.subtitle")}
      crumbs={[{ label: t("nav.groups.facilities") }, { label: t("nav.items.facilities") }]}
    >
      <FacilitiesView />
    </Screen>
  );
}
