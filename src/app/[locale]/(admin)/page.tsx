import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/layout/admin-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Dashboard } from "@/features/dashboard/components/dashboard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  return { title: t("title") };
}

// S02 — Dashboard. The header prerenders; widgets stream in per permission.
export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  return (
    <PageContainer>
      <PageHeader
        title={t("title")}
        description={
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span aria-hidden className="size-1.5 rounded-full bg-emerald-500 pulse-dot" />
            <span>{t("updated")}</span>
          </span>
        }
      />
      <Dashboard />
    </PageContainer>
  );
}
