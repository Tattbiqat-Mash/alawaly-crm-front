import { getTranslations } from "next-intl/server";
import { Screen, screenMetadata } from "@/components/layout/screen";
import { PriceApprovalsView } from "@/features/pricing/components/price-approvals-view";

export const generateMetadata = screenMetadata("priceApprovals");

// S05 — Price approvals.
export default async function PriceApprovalsPage() {
  const t = await getTranslations();
  return (
    <Screen
      fill
      title={t("priceApprovals.title")}
      description={t("priceApprovals.subtitle")}
      crumbs={[{ label: t("nav.groups.inventory") }, { label: t("nav.items.priceApprovals") }]}
    >
      <PriceApprovalsView />
    </Screen>
  );
}
