import { getTranslations } from "next-intl/server";
import { Screen, screenMetadata } from "@/components/layout/screen";
import { ServiceDeskView } from "@/features/service/components/service-desk-view";

export const generateMetadata = screenMetadata("serviceDesk");

// S24 — Service desk.
export default async function ServiceDeskPage() {
  const t = await getTranslations();
  return (
    <Screen
      fill
      title={t("serviceDesk.title")}
      description={t("serviceDesk.subtitle")}
      crumbs={[{ label: t("nav.groups.afterSales") }, { label: t("nav.items.serviceDesk") }]}
    >
      <ServiceDeskView />
    </Screen>
  );
}
