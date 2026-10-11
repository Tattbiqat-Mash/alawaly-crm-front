import { getTranslations } from "next-intl/server";
import { Screen, screenMetadata } from "@/components/layout/screen";
import { UnitImportView } from "@/features/unit-import/components/unit-import-view";

export const generateMetadata = screenMetadata("unitImport");

// S06 — Import units.
export default async function UnitImportPage() {
  const t = await getTranslations();
  return (
    <Screen
      title={t("unitImport.title")}
      description={t("unitImport.subtitle")}
      crumbs={[{ label: t("nav.groups.inventory") }, { label: t("nav.items.units"), href: "/units" }, { label: t("nav.items.importUnits") }]}
    >
      <UnitImportView />
    </Screen>
  );
}
