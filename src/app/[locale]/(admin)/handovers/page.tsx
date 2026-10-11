import { getTranslations } from "next-intl/server";
import { Screen, screenMetadata } from "@/components/layout/screen";
import { HandoversView } from "@/features/handover/components/handovers-view";

export const generateMetadata = screenMetadata("handovers");

// S20 — Handovers.
export default async function HandoversPage() {
  const t = await getTranslations();
  return (
    <Screen
      fill
      title={t("handovers.title")}
      description={t("handovers.subtitle")}
      crumbs={[{ label: t("nav.groups.sales") }, { label: t("nav.items.handovers") }]}
    >
      <HandoversView />
    </Screen>
  );
}
