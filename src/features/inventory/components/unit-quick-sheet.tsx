"use client";

import { ArrowUpRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useEndSide } from "@/hooks/use-end-side";
import { Link } from "@/i18n/navigation";
import { formatDateTime } from "@/lib/format/dates";
import { isOn } from "@/lib/format/localized";
import { formatDecimal, formatMoney } from "@/lib/format/money";
import type { UnitListItem } from "../types";
import { UnitStatusBadge } from "./unit-status-badge";
import { useInventoryLookups } from "./use-lookups";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-2.5 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-end font-medium">{children}</dd>
    </div>
  );
}

/** Quick details from the list row (no extra request); "Full view" opens S04. */
export function UnitQuickSheet({ unit, onClose }: { unit: UnitListItem | null; onClose: () => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const side = useEndSide();
  const lookups = useInventoryLookups();

  return (
    <Sheet open={unit !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side={side} className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        {unit && (
          <>
            <SheetHeader className="border-b">
              <SheetTitle>{t("units.quick.title", { number: unit.unit_number ?? `#${unit.id}` })}</SheetTitle>
              <SheetDescription>
                {[lookups.projectName(unit.project_id), lookups.buildingName(unit.building_id)].filter(Boolean).join(" · ")}
              </SheetDescription>
            </SheetHeader>
            <dl className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
              <Row label={t("units.columns.status")}>
                <UnitStatusBadge status={unit.status} />
              </Row>
              <Row label={t("units.columns.type")}>{lookups.typeName(unit.unit_type_id) || "—"}</Row>
              <Row label={t("units.columns.rooms")}>
                <span className="num">{unit.rooms ?? "—"}</span>
              </Row>
              <Row label={t("units.form.bathrooms")}>
                <span className="num">{unit.bathrooms ?? "—"}</span>
              </Row>
              <Row label={t("units.columns.area")}>
                <span className="num">{formatDecimal(unit.total_area, locale)}</span>
              </Row>
              <Row label={t("units.form.priceInTax")}>
                <span className="num">{formatMoney(unit.price_in_tax, locale)}</span>
              </Row>
              <Row label={t("units.form.reservationFee")}>
                <span className="num">{formatMoney(unit.reservation_amount, locale)}</span>
              </Row>
              <Row label={t("units.filters.active")}>{isOn(unit.active) ? t("common.yes") : t("common.no")}</Row>
              <Row label={t("units.columns.updated")}>
                <span className="num">{formatDateTime(unit.updated_at, locale)}</span>
              </Row>
            </dl>
            <SheetFooter className="border-t">
              <Button asChild>
                <Link href={`/units/${unit.id}`} prefetch>
                  {t("common.openFullView")}
                  <ArrowUpRight data-icon="inline-end" className="rtl:-scale-x-100" />
                </Link>
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
