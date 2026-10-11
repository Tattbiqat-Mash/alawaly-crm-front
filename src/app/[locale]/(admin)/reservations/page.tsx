import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Screen, screenMetadata } from "@/components/layout/screen";
import { Button } from "@/components/ui/button";
import { Can } from "@/features/auth/components/can";
import { ReservationsView } from "@/features/sales/components/reservations-view";
import { Link } from "@/i18n/navigation";

export const generateMetadata = screenMetadata("reservations");

// S11 — Reservations.
export default async function ReservationsPage() {
  const t = await getTranslations();
  return (
    <Screen
      fill
      title={t("reservations.title")}
      description={t("reservations.subtitle")}
      crumbs={[{ label: t("nav.groups.sales") }, { label: t("nav.items.reservations") }]}
      actions={
        <Can permission="sales.reserve">
          <Button asChild>
            <Link href="/reservations/new">
              <Plus data-icon="inline-start" />
              {t("reservations.new")}
            </Link>
          </Button>
        </Can>
      }
    >
      <ReservationsView />
    </Screen>
  );
}
