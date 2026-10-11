import { getTranslations } from "next-intl/server";
import { Screen, screenMetadata } from "@/components/layout/screen";
import { UsersView } from "@/features/admin/components/users-view";

export const generateMetadata = screenMetadata("users");

// S38 — Staff users.
export default async function Page() {
  const t = await getTranslations();
  return (
    <Screen
      fill
      title={t("users.title")}
      description={t("users.subtitle")}
      crumbs={[{ label: t("nav.groups.administration") }, { label: t("nav.items.users") }]}
    >
      <UsersView />
    </Screen>
  );
}
