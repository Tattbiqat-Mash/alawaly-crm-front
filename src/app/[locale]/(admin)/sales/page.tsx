import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Screen, screenMetadata } from "@/components/layout/screen";
import { Button } from "@/components/ui/button";
import { Can } from "@/features/auth/components/can";
import { SalesView } from "@/features/sales/components/sales-view";
import { Link } from "@/i18n/navigation";

export const generateMetadata = screenMetadata("sales");

// S13 — Sales.
export default async function SalesPage() {
  const t = await getTranslations();
  return (
    <Screen
      fill
      title={t("sales.title")}
      description={t("sales.subtitle")}
      crumbs={[{ label: t("nav.groups.sales") }, { label: t("nav.items.sales") }]}
      actions={
        <Can permission="sales.manage">
          <Button asChild>
            <Link href="/sales/new">
              <Plus data-icon="inline-start" />
              {t("sales.new")}
            </Link>
          </Button>
        </Can>
      }
    >
      <SalesView />
    </Screen>
  );
}
