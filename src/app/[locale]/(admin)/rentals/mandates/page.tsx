import { getTranslations } from "next-intl/server";
import { Screen, screenMetadata } from "@/components/layout/screen";
import { MandatesView } from "@/features/rentals/components/mandates-view";

export const generateMetadata = screenMetadata("mandates");

// S31 — Rental mandates.
export default async function Page() {
  const t = await getTranslations();
  return (
    <Screen
      fill
      title={t("mandates.title")}
      description={t("mandates.subtitle")}
      crumbs={[{ label: t("nav.groups.rentals") }, { label: t("nav.items.mandates") }]}
    >
      <MandatesView />
    </Screen>
  );
}
