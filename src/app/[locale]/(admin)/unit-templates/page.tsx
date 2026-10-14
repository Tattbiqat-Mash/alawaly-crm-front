import { getTranslations } from "next-intl/server";
import { Screen, screenMetadata } from "@/components/layout/screen";
import { UnitTemplatesView } from "@/features/catalog/components/unit-templates-view";

export const generateMetadata = screenMetadata("unitTemplates");

// S25 — Unit templates (unit styles): the data units share.
export default async function UnitTemplatesPage() {
  const t = await getTranslations();
  return (
    <Screen
      fill
      title={t("unitTemplates.title")}
      description={t("unitTemplates.subtitle")}
      crumbs={[{ label: t("nav.groups.inventory") }, { label: t("nav.items.unitTemplates") }]}
    >
      <UnitTemplatesView />
    </Screen>
  );
}
