import { getTranslations } from "next-intl/server";
import { Screen, screenMetadata } from "@/components/layout/screen";
import { MaintenanceView } from "@/features/maintenance/components/maintenance-view";

export const generateMetadata = screenMetadata("maintenance");

// S26 — Teams, technicians and contractors.
export default async function MaintenancePage() {
  const t = await getTranslations();
  return (
    <Screen
      fill
      title={t("maintenance.title")}
      description={t("maintenance.subtitle")}
      crumbs={[{ label: t("nav.groups.afterSales") }, { label: t("nav.items.teams") }]}
    >
      <MaintenanceView />
    </Screen>
  );
}
