import { getTranslations } from "next-intl/server";
import { Screen, screenMetadata } from "@/components/layout/screen";
import { NewSaleView } from "@/features/sales/components/new-sale-view";

export const generateMetadata = screenMetadata("newSale");

// S14 — New sale.
export default async function NewSalePage() {
  const t = await getTranslations();
  return (
    <Screen
      title={t("newSale.title")}
      description={t("newSale.subtitle")}
      crumbs={[{ label: t("nav.groups.sales") }, { label: t("nav.items.sales"), href: "/sales" }, { label: t("newSale.title") }]}
    >
      <NewSaleView />
    </Screen>
  );
}
