import { getTranslations } from "next-intl/server";
import { Screen, screenMetadata } from "@/components/layout/screen";
import { ConfirmationsView } from "@/features/payments/components/confirmations-view";

export const generateMetadata = screenMetadata("confirmations");

// S17 — Payment confirmations (two approvers).
export default async function ConfirmationsPage() {
  const t = await getTranslations();
  return (
    <Screen
      fill
      title={t("confirmations.title")}
      description={t("confirmations.subtitle")}
      crumbs={[{ label: t("nav.groups.finance") }, { label: t("nav.items.confirmations") }]}
    >
      <ConfirmationsView />
    </Screen>
  );
}
