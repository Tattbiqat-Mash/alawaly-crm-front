import { getTranslations } from "next-intl/server";
import { Screen, screenMetadata } from "@/components/layout/screen";
import { RolesView } from "@/features/admin/components/roles-view";

export const generateMetadata = screenMetadata("roles");

// S37 — Roles and permissions.
export default async function Page() {
  const t = await getTranslations();
  return (
    <Screen
      fill
      title={t("roles.title")}
      description={t("roles.subtitle")}
      crumbs={[{ label: t("nav.groups.administration") }, { label: t("nav.items.roles") }]}
    >
      <RolesView />
    </Screen>
  );
}
