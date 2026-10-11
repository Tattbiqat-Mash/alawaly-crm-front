import { getTranslations } from "next-intl/server";
import { Screen, screenMetadata } from "@/components/layout/screen";
import { BuildingsView } from "@/features/catalog/components/buildings-view";

export const generateMetadata = screenMetadata("buildings");

// S09 — Buildings.
export default async function BuildingsPage() {
  const t = await getTranslations();
  return (
    <Screen fill title={t("buildings.title")} crumbs={[{ label: t("nav.groups.inventory") }, { label: t("nav.items.buildings") }]}>
      <BuildingsView />
    </Screen>
  );
}
