import { getTranslations } from "next-intl/server";
import { Screen, screenMetadata } from "@/components/layout/screen";
import { WarrantyView } from "@/features/warranty/components/warranty-view";

export const generateMetadata = screenMetadata("warranty");

// S23 — Warranty.
export default async function WarrantyPage() {
  const t = await getTranslations();
  return (
    <Screen
      fill
      title={t("warranty.title")}
      description={t("warranty.subtitle")}
      crumbs={[{ label: t("nav.groups.afterSales") }, { label: t("nav.items.warranty") }]}
    >
      <WarrantyView />
    </Screen>
  );
}
