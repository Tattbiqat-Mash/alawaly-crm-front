import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { OwnerHeader } from "@/components/layout/owner-shell";
import { OwnerMore } from "@/features/owner-auth/components/owner-more";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("owner.more");
  return { title: t("title") };
}

// O17 — More and sign out.
export default async function OwnerMorePage() {
  const t = await getTranslations("owner.more");
  return (
    <>
      <OwnerHeader title={t("title")} backHref="/owner" />
      <div className="p-4">
        <OwnerMore />
      </div>
    </>
  );
}
