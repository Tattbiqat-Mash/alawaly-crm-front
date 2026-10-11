import { getTranslations } from "next-intl/server";
import { Screen, screenMetadata } from "@/components/layout/screen";
import { ReconcileView } from "@/features/payments/components/reconcile-view";

export const generateMetadata = screenMetadata("reconcile");

// S19 — Reconciliation.
export default async function ReconcilePage() {
  const t = await getTranslations();
  return (
    <Screen
      title={t("reconcile.title")}
      description={t("reconcile.subtitle")}
      crumbs={[{ label: t("nav.groups.finance") }, { label: t("nav.items.reconciliation") }]}
    >
      <ReconcileView />
    </Screen>
  );
}
