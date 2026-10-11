import { getTranslations } from "next-intl/server";
import { Screen, screenMetadata } from "@/components/layout/screen";
import { MaintenancePlanView } from "@/features/facilities/components/maintenance-plan-view";

export const generateMetadata = screenMetadata("maintenancePlan");

// S29 — Maintenance plan.
export default async function MaintenancePlanPage() {
  const t = await getTranslations();
  return (
    <Screen
      fill
      title={t("maintenancePlan.title")}
      description={t("maintenancePlan.subtitle")}
      crumbs={[{ label: t("nav.groups.facilities") }, { label: t("nav.items.maintenancePlan") }]}
    >
      <MaintenancePlanView />
    </Screen>
  );
}
