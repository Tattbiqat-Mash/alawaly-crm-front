import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { OwnerHeader } from "@/components/layout/owner-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { OwnerHome } from "@/features/owner-home/components/owner-home";
import { OWNER_PROFILE_COOKIE } from "@/lib/bff/cookies";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("owner");
  return { title: t("title") };
}

/** The API has no owner /me; the name comes from the verify response kept by the BFF. */
async function Greeting() {
  const t = await getTranslations("owner.home");
  let name: string | null = null;
  try {
    const raw = (await cookies()).get(OWNER_PROFILE_COOKIE)?.value;
    const parsed = raw ? (JSON.parse(raw) as { name?: unknown }) : null;
    name = typeof parsed?.name === "string" ? parsed.name : null;
  } catch {
    name = null;
  }
  return <p className="text-xl font-semibold">{name ? t("hello", { name }) : t("helloNoName")}</p>;
}

// O03 — Owner home.
export default async function OwnerHomePage() {
  const t = await getTranslations("owner");
  return (
    <>
      <OwnerHeader title={t("tabs.home")} />
      <div className="grid gap-4 p-4">
        <Suspense fallback={<Skeleton className="h-7 w-40" />}>
          <Greeting />
        </Suspense>
        <OwnerHome />
      </div>
    </>
  );
}
