import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthFrame } from "@/components/layout/auth-frame";
import { OwnerSignInForm } from "@/features/owner-auth/components/sign-in-form";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("owner");
  return { title: t("title") };
}

// O01 — Owner sign in (phone).
export default async function OwnerSignInPage() {
  const t = await getTranslations("owner.signIn");
  return (
    <AuthFrame
      title={t("title")}
      subtitle={t("subtitle")}
      footer={
        <Link href="/login" className="underline-offset-4 hover:text-foreground hover:underline">
          {t("staffLink")}
        </Link>
      }
    >
      <OwnerSignInForm />
    </AuthFrame>
  );
}
