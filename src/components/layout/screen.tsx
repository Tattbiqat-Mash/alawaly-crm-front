import type { Metadata } from "next";
import type { Messages } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Suspense, type ReactNode } from "react";
import { PageHeader, type Crumb } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "./admin-shell";

/** Namespaces that have a `title` key, usable as a screen's document title. */
type TitledNamespace = { [K in keyof Messages]: Messages[K] extends { title: string } ? K : never }[keyof Messages];

/** `export const generateMetadata = screenMetadata("projects")` */
export function screenMetadata(namespace: TitledNamespace) {
  return async (): Promise<Metadata> => {
    const t = await getTranslations(namespace);
    return { title: t("title" as never) };
  };
}

/**
 * Standard staff screen: header (title, description, breadcrumbs, actions) prerenders; the
 * interactive body reads URL state, so it streams in behind Suspense.
 */
export async function Screen({
  title,
  description,
  crumbs,
  actions,
  fill,
  children,
}: {
  title: string;
  description?: string;
  crumbs: Crumb[];
  actions?: ReactNode;
  /** Height-filling layout for table screens. */
  fill?: boolean;
  children: ReactNode;
}) {
  const t = await getTranslations("common");
  return (
    <PageContainer fill={fill}>
      <PageHeader title={title} description={description} breadcrumbs={crumbs} breadcrumbsLabel={t("breadcrumbs")} actions={actions} />
      <Suspense fallback={<Skeleton className={fill ? "min-h-[380px] flex-1 rounded-xl" : "h-80 w-full rounded-xl"} />}>
        {children}
      </Suspense>
    </PageContainer>
  );
}
