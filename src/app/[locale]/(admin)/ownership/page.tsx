import { getTranslations } from "next-intl/server";
import { Screen, screenMetadata } from "@/components/layout/screen";
import { OwnershipView } from "@/features/ownership/components/ownership-view";

export const generateMetadata = screenMetadata("ownership");

// S22 — Ownership and transfers.
export default async function OwnershipPage() {
  const t = await getTranslations();
  return (
    <Screen
      fill
      title={t("ownership.title")}
      description={t("ownership.subtitle")}
      crumbs={[{ label: t("nav.groups.sales") }, { label: t("nav.items.ownership") }]}
    >
      <OwnershipView />
    </Screen>
  );
}
