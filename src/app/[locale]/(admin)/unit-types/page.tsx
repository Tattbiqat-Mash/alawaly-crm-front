import { getTranslations } from "next-intl/server";
import { Screen, screenMetadata } from "@/components/layout/screen";
import { UnitTypesView } from "@/features/catalog/components/unit-types-view";

export const generateMetadata = screenMetadata("unitTypes");

// S10 — Unit types and lookups.
export default async function UnitTypesPage() {
  const t = await getTranslations();
  return (
    <Screen fill title={t("unitTypes.title")} crumbs={[{ label: t("nav.groups.inventory") }, { label: t("nav.items.unitTypes") }]}>
      <UnitTypesView />
    </Screen>
  );
}
