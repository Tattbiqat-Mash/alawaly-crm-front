import { getTranslations } from "next-intl/server";
import { Screen, screenMetadata } from "@/components/layout/screen";
import { ProjectsView } from "@/features/catalog/components/projects-view";

export const generateMetadata = screenMetadata("projects");

// S08 — Projects.
export default async function ProjectsPage() {
  const t = await getTranslations();
  return (
    <Screen fill title={t("projects.title")} crumbs={[{ label: t("nav.groups.inventory") }, { label: t("nav.items.projects") }]}>
      <ProjectsView />
    </Screen>
  );
}
