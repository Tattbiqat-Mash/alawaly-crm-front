import { getTranslations } from "next-intl/server";
import { Screen, screenMetadata } from "@/components/layout/screen";
import { TransactionsActions, TransactionsView } from "@/features/payments/components/transactions-view";

export const generateMetadata = screenMetadata("payments");

// S16 — Payment transactions.
export default async function PaymentsPage() {
  const t = await getTranslations();
  return (
    <Screen
      fill
      title={t("payments.title")}
      description={t("payments.subtitle")}
      crumbs={[{ label: t("nav.groups.finance") }, { label: t("nav.items.transactions") }]}
      actions={<TransactionsActions />}
    >
      <TransactionsView />
    </Screen>
  );
}
