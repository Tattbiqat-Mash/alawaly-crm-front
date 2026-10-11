import { getTranslations } from "next-intl/server";
import { Screen, screenMetadata } from "@/components/layout/screen";
import { DataView } from "@/features/data/components/data-view";

export const generateMetadata = screenMetadata("data");

// S36 — Exports and documents.
export default async function Page() {
  const t = await getTranslations();
  return (
    <Screen
      fill
      title={t("data.title")}
      description={t("data.subtitle")}
      crumbs={[{ label: t("nav.groups.data") }, { label: t("nav.items.exports") }]}
    >
      <DataView />
    </Screen>
  );
}
