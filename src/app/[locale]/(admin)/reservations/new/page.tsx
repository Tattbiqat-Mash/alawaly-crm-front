import { getTranslations } from "next-intl/server";
import { Screen, screenMetadata } from "@/components/layout/screen";
import { NewReservationView } from "@/features/sales/components/new-reservation-view";

export const generateMetadata = screenMetadata("newReservation");

// S12 — New reservation.
export default async function NewReservationPage() {
  const t = await getTranslations();
  return (
    <Screen
      title={t("newReservation.title")}
      description={t("newReservation.subtitle")}
      crumbs={[{ label: t("nav.groups.sales") }, { label: t("nav.items.reservations"), href: "/reservations" }, { label: t("newReservation.title") }]}
    >
      <NewReservationView />
    </Screen>
  );
}
