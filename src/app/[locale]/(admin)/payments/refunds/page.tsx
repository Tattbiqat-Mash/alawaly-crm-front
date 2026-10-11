import { getTranslations } from "next-intl/server";
import { Screen, screenMetadata } from "@/components/layout/screen";
import { RefundsView } from "@/features/payments/components/refunds-view";

export const generateMetadata = screenMetadata("refunds");

// S18 — Refunds.
export default async function RefundsPage() {
  const t = await getTranslations();
  return (
    <Screen
      fill
      title={t("refunds.title")}
      description={t("refunds.subtitle")}
      crumbs={[{ label: t("nav.groups.finance") }, { label: t("nav.items.transactions"), href: "/payments" }, { label: t("nav.items.refunds") }]}
    >
      <RefundsView />
    </Screen>
  );
}
