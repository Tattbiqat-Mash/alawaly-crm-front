import { getTranslations } from "next-intl/server";
import { Screen, screenMetadata } from "@/components/layout/screen";
import { RentView } from "@/features/rentals/components/rent-view";

export const generateMetadata = screenMetadata("rent");

// S34 — Rent collection.
export default async function Page() {
  const t = await getTranslations();
  return (
    <Screen
      fill
      title={t("rent.title")}
      description={t("rent.subtitle")}
      crumbs={[{ label: t("nav.groups.rentals") }, { label: t("nav.items.rentCollection") }]}
    >
      <RentView />
    </Screen>
  );
}
