import { getTranslations } from "next-intl/server";
import { Screen, screenMetadata } from "@/components/layout/screen";
import { IncidentsView } from "@/features/facilities/components/incidents-view";

export const generateMetadata = screenMetadata("incidents");

// S30 — Incidents.
export default async function IncidentsPage() {
  const t = await getTranslations();
  return (
    <Screen
      fill
      title={t("incidents.title")}
      description={t("incidents.subtitle")}
      crumbs={[{ label: t("nav.groups.facilities") }, { label: t("nav.items.incidents") }]}
    >
      <IncidentsView />
    </Screen>
  );
}
