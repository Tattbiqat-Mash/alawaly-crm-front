import { getTranslations } from "next-intl/server";
import { Screen, screenMetadata } from "@/components/layout/screen";
import { TenantsView } from "@/features/rentals/components/tenants-view";

export const generateMetadata = screenMetadata("tenants");

// S32 — Tenants.
export default async function Page() {
  const t = await getTranslations();
  return (
    <Screen
      fill
      title={t("tenants.title")}
      description={t("tenants.subtitle")}
      crumbs={[{ label: t("nav.groups.rentals") }, { label: t("nav.items.tenants") }]}
    >
      <TenantsView />
    </Screen>
  );
}
