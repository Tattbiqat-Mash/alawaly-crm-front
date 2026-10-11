"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import { localizedName } from "@/lib/format/localized";
import { useBuildings, useProjects, useUnitTypes } from "../hooks";
import type { Building, Project, UnitType } from "../types";

const byId = <T extends { id: number }>(items: T[] | undefined) => new Map((items ?? []).map((x) => [x.id, x]));

/** Labels for project, building and unit type ids (lists come with ids only). */
export function useInventoryLookups() {
  const locale = useLocale();
  const t = useTranslations("units");
  const projects = useProjects();
  const buildings = useBuildings();
  const unitTypes = useUnitTypes();

  return useMemo(() => {
    const projectMap = byId<Project>(projects.data);
    const buildingMap = byId<Building>(buildings.data);
    const typeMap = byId<UnitType>(unitTypes.data);
    return {
      projects: projects.data ?? [],
      buildings: buildings.data ?? [],
      unitTypes: unitTypes.data ?? [],
      projectName: (id: number | null) => (id === null ? "" : localizedName(projectMap.get(id), locale) || `#${id}`),
      buildingName: (id: number | null) => {
        if (id === null) return "";
        const code = buildingMap.get(id)?.building_code;
        return code ? t("buildingLabel", { code }) : `#${id}`;
      },
      typeName: (id: number | null) => (id === null ? "" : localizedName(typeMap.get(id), locale) || `#${id}`),
    };
  }, [projects.data, buildings.data, unitTypes.data, locale, t]);
}
