import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { OwnerHeader } from "@/components/layout/owner-shell";
import { OwnerWarrantiesView } from "@/features/owner/components/owner-purchase";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ownerPortal");
  return { title: t("titles.warranties") };
}

// O11 — Warranties.
export default async function Page() {
  const t = await getTranslations("ownerPortal");
  return (
    <>
      <OwnerHeader title={t("titles.warranties")} backHref="/owner/more" />
      <div className="py-3">
        <OwnerWarrantiesView />
      </div>
    </>
  );
}
