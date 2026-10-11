import { getTranslations } from "next-intl/server";
import { Screen, screenMetadata } from "@/components/layout/screen";
import { IntegrationsView } from "@/features/integrations/components/integrations-view";

export const generateMetadata = screenMetadata("integrations");

// S40 — Integrations.
export default async function Page() {
  const t = await getTranslations();
  return (
    <Screen
      fill
      title={t("integrations.title")}
      description={t("integrations.subtitle")}
      crumbs={[{ label: t("nav.groups.administration") }, { label: t("nav.items.integrations") }]}
    >
      <IntegrationsView />
    </Screen>
  );
}
