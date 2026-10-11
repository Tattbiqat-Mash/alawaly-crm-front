import { getTranslations } from "next-intl/server";
import { Screen, screenMetadata } from "@/components/layout/screen";
import { TemplatesView } from "@/features/templates/components/templates-view";

export const generateMetadata = screenMetadata("templates");

// S27 — Notification templates.
export default async function TemplatesPage() {
  const t = await getTranslations();
  return (
    <Screen
      fill
      title={t("templates.title")}
      description={t("templates.subtitle")}
      crumbs={[{ label: t("nav.groups.afterSales") }, { label: t("nav.items.notificationTemplates") }]}
    >
      <TemplatesView />
    </Screen>
  );
}
