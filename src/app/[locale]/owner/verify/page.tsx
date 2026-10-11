import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { AuthFrame } from "@/components/layout/auth-frame";
import { Skeleton } from "@/components/ui/skeleton";
import { OwnerVerifyForm } from "@/features/owner-auth/components/verify-form";
import { OWNER_PHONE_HINT_COOKIE } from "@/lib/bff/cookies";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("owner.verify");
  return { title: t("title") };
}

/** Masked phone ("•••• 0101") set when the code was requested; the full number stays server-side. */
async function Subtitle() {
  const t = await getTranslations("owner.verify");
  const hint = (await cookies()).get(OWNER_PHONE_HINT_COOKIE)?.value;
  // U+2066/U+2069 isolate the number so it reads left to right inside Arabic text.
  return hint ? t("subtitle", { phone: `⁦${hint}⁩` }) : t("subtitleNoPhone");
}

// O02 — Enter the code.
export default async function OwnerVerifyPage() {
  const t = await getTranslations("owner.verify");
  return (
    <AuthFrame
      title={t("title")}
      subtitle={
        <Suspense fallback={t("subtitleNoPhone")}>
          <Subtitle />
        </Suspense>
      }
    >
      <Suspense fallback={<Skeleton className="h-48 w-full" />}>
        <OwnerVerifyForm />
      </Suspense>
    </AuthFrame>
  );
}
