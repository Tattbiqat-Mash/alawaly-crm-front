import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthFrame } from "@/components/layout/auth-frame";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginForm } from "@/features/auth/components/login-form";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("title") };
}

// S01 — Staff sign in.
export default async function LoginPage() {
  const t = await getTranslations("auth");
  return (
    <AuthFrame
      title={t("title")}
      subtitle={t("subtitle")}
      footer={
        <Link href="/owner/sign-in" className="underline-offset-4 hover:text-foreground hover:underline">
          {t("ownerLink")}
        </Link>
      }
    >
      <Suspense fallback={<Skeleton className="h-52 w-full" />}>
        <LoginForm />
      </Suspense>
    </AuthFrame>
  );
}
