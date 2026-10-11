import { getTranslations } from "next-intl/server";
import { Screen, screenMetadata } from "@/components/layout/screen";
import { AuditView } from "@/features/admin/components/audit-view";

export const generateMetadata = screenMetadata("audit");

// S39 — Audit log.
export default async function Page() {
  const t = await getTranslations();
  return (
    <Screen
      fill
      title={t("audit.title")}
      description={t("audit.subtitle")}
      crumbs={[{ label: t("nav.groups.administration") }, { label: t("nav.items.audit") }]}
    >
      <AuditView />
    </Screen>
  );
}
