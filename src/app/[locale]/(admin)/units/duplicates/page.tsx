import { getTranslations } from "next-intl/server";
import { Screen, screenMetadata } from "@/components/layout/screen";
import { DuplicatesView } from "@/features/inventory/components/duplicates-view";

export const generateMetadata = screenMetadata("duplicates");

// S07 — Duplicate units.
export default async function DuplicatesPage() {
  const t = await getTranslations();
  return (
    <Screen
      fill
      title={t("duplicates.title")}
      description={t("duplicates.subtitle")}
      crumbs={[{ label: t("nav.groups.inventory") }, { label: t("nav.items.units"), href: "/units" }, { label: t("nav.items.duplicates") }]}
    >
      <DuplicatesView />
    </Screen>
  );
}
