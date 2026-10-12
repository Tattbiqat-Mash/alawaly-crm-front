"use client";

import { MousePointerClick } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { formatDecimal, formatMoney } from "@/lib/format/money";
import { unitFloor } from "../../site-plan";
import type { UnitListItem } from "../../types";
import { UnitStatusBadge } from "../unit-status-badge";
import { useInventoryLookups } from "../use-lookups";

export type Peek = { unit: UnitListItem; rect: DOMRect };

const CARD_WIDTH = 240;
const EDGE = 12;

function Spec({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[10px] text-muted-foreground">{label}</dt>
      <dd className="num text-xs font-semibold text-foreground">{children}</dd>
    </div>
  );
}

/** Hover/focus card for one unit window. One instance for the whole plan, placed next to the window. */
export function UnitPeek({ peek }: { peek: Peek | null }) {
  const t = useTranslations();
  const locale = useLocale();
  const lookups = useInventoryLookups();
  if (!peek) return null;

  const { unit, rect } = peek;
  const above = rect.top > 220;
  const half = CARD_WIDTH / 2;
  const left = Math.min(Math.max(rect.left + rect.width / 2, half + EDGE), window.innerWidth - half - EDGE);
  const floor = unitFloor(unit);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed z-50 animate-in fade-in-0 zoom-in-95 duration-150"
      style={{ left, top: above ? rect.top - 8 : rect.bottom + 8, width: CARD_WIDTH, translate: above ? "-50% -100%" : "-50% 0" }}
    >
      <div className="rounded-xl border bg-popover p-3 text-popover-foreground shadow-lg">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="num truncate text-sm font-bold tracking-tight">{t("units.quick.title", { number: unit.unit_number ?? `#${unit.id}` })}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {[lookups.typeName(unit.unit_type_id), floor === null ? null : floor === 0 ? t("units.plan.groundFloor") : t("units.plan.floor", { floor })]
                .filter(Boolean)
                .join(" · ") || "—"}
            </p>
          </div>
          <UnitStatusBadge status={unit.status} />
        </div>
        <dl className="mt-2.5 grid grid-cols-3 gap-2 border-t pt-2.5">
          <Spec label={t("units.columns.rooms")}>{unit.rooms ?? "—"}</Spec>
          <Spec label={t("units.columns.area")}>{formatDecimal(unit.total_area, locale)}</Spec>
          <Spec label={t("units.form.bathrooms")}>{unit.bathrooms ?? "—"}</Spec>
        </dl>
        <div className="mt-2.5 flex items-center justify-between gap-2 rounded-lg bg-muted/60 px-2.5 py-1.5">
          <span className="text-[10px] text-muted-foreground">{t("units.columns.price")}</span>
          <span className="num text-xs font-bold">{formatMoney(unit.price_in_tax, locale)}</span>
        </div>
        <p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
          <MousePointerClick className="size-3" />
          {t("units.plan.openHint")}
        </p>
      </div>
    </div>
  );
}
