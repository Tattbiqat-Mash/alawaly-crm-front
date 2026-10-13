"use client";

import { useTranslations } from "next-intl";
import { ExpandingSearch } from "@/components/shared/filters";
import { useUnitsListState } from "../hooks";
import { ViewSwitch } from "./view-switch";

/** Header controls bound to the URL state: search and the table/plan switch. Needs a Suspense boundary. */
export function UnitsHeaderControls() {
  const t = useTranslations();
  const [state, setState] = useUnitsListState();
  return (
    <>
      <ExpandingSearch value={state.q} onChange={(q) => setState({ q, page: 1 })} placeholder={t("units.filters.search")} />
      <ViewSwitch value={state.view} onChange={(view) => setState({ view })} />
    </>
  );
}
