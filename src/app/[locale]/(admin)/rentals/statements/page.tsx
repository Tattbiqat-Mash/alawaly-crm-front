import { getTranslations } from "next-intl/server";
import { Screen, screenMetadata } from "@/components/layout/screen";
import { StatementsView } from "@/features/rentals/components/statements-view";

export const generateMetadata = screenMetadata("statements");

// S35 — Owner statements.
export default async function Page() {
  const t = await getTranslations();
  return (
    <Screen
      fill
      title={t("statements.title")}
      description={t("statements.subtitle")}
      crumbs={[{ label: t("nav.groups.rentals") }, { label: t("nav.items.statements") }]}
    >
      <StatementsView />
    </Screen>
  );
}
