import { getTranslations } from "next-intl/server";
import { Screen, screenMetadata } from "@/components/layout/screen";
import { LeasesView } from "@/features/rentals/components/leases-view";

export const generateMetadata = screenMetadata("leases");

// S33 — Leases.
export default async function Page() {
  const t = await getTranslations();
  return (
    <Screen
      fill
      title={t("leases.title")}
      description={t("leases.subtitle")}
      crumbs={[{ label: t("nav.groups.rentals") }, { label: t("nav.items.leases") }]}
    >
      <LeasesView />
    </Screen>
  );
}
