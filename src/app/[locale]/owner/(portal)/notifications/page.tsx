import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { OwnerHeader } from "@/components/layout/owner-shell";
import { OwnerNotificationsView } from "@/features/owner/components/owner-inbox";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ownerPortal");
  return { title: t("titles.notifications") };
}

// O15 — Notifications.
export default async function Page() {
  const t = await getTranslations("ownerPortal");
  return (
    <>
      <OwnerHeader title={t("titles.notifications")} />
      <div className="py-3">
        <OwnerNotificationsView />
      </div>
    </>
  );
}
