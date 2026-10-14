"use client";

import { ArrowUpRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { isUnitStatus } from "@/config/statuses";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useEndSide } from "@/hooks/use-end-side";
import { Link } from "@/i18n/navigation";
import { formatDateTime } from "@/lib/format/dates";
import { isOn } from "@/lib/format/localized";
import { formatDecimal, formatMoney } from "@/lib/format/money";
import { cn } from "@/lib/utils";
import type { UnitListItem } from "../types";
import { swatchTone } from "./site-plan/unit-tone";
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
            <SheetHeader className="relative border-b bg-muted/20 px-4 py-3 pt-4 sm:px-5 sm:py-3.5 sm:pt-4.5">
              <span aria-hidden className={cn("absolute inset-x-0 top-0 h-1", swatchTone[isUnitStatus(unit.status) ? unit.status : "unknown"])} />
              {/* End padding keeps the status clear of the sheet's close button. */}
              <div className="flex items-start justify-between gap-2 pe-8">
                <div>
                  <SheetTitle className="text-base font-bold tracking-tight sm:text-lg">
                    {t("units.quick.title", { number: unit.unit_number ?? `#${unit.id}` })}
                  </SheetTitle>
                  <SheetDescription className="mt-0.5 text-xs">
                    {[lookups.projectName(unit.project_id), lookups.buildingName(unit.building_id)].filter(Boolean).join(" · ")}
                  </SheetDescription>
                </div>
                <UnitStatusBadge status={unit.status} />
              </div>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5 sm:py-3.5">
              {/* Quick specs grid */}
              <div className="mb-3.5 grid grid-cols-3 gap-2">
                <div className="col-span-3 rounded-xl border border-primary/15 bg-linear-to-br from-accent to-card p-3.5 shadow-2xs">
                  <span className="text-xs font-medium text-muted-foreground">{t("units.form.priceInTax")}</span>
                  <p className="num mt-1 text-2xl font-bold tracking-tight text-foreground">{formatMoney(unit.price_in_tax, locale)}</p>
                </div>
                <div className="rounded-xl border bg-card p-2.5 shadow-2xs">
                  <span className="text-[11px] font-medium text-muted-foreground">{t("units.columns.area")}</span>
                  <p className="num mt-0.5 text-sm font-bold text-foreground sm:text-base">
                    {formatDecimal(unit.total_area, locale)} <span className="text-xs font-normal text-muted-foreground">m²</span>
                  </p>
                </div>
                <div className="rounded-xl border bg-card p-2.5 shadow-2xs">
                  <span className="text-[11px] font-medium text-muted-foreground">{t("units.columns.rooms")}</span>
                  <p className="num mt-0.5 text-sm font-semibold text-foreground sm:text-base">{unit.rooms ?? "—"}</p>
                </div>
                <div className="rounded-xl border bg-card p-2.5 shadow-2xs">
                  <span className="text-[11px] font-medium text-muted-foreground">{t("units.form.bathrooms")}</span>
                  <p className="num mt-0.5 text-sm font-semibold text-foreground sm:text-base">{unit.bathrooms ?? "—"}</p>
                </div>
              </div>

              <dl className="divide-y rounded-xl border bg-card px-3 shadow-2xs">
                <Row label={t("units.columns.type")}>{lookups.typeName(unit.unit_type_id) || "—"}</Row>
                <Row label={t("units.form.reservationFee")}>
                  <span className="num font-semibold">{formatMoney(unit.reservation_amount, locale)}</span>
                </Row>
                <Row label={t("units.filters.active")}>
                  <span className={isOn(unit.active) ? "text-success font-medium" : "text-muted-foreground"}>
                    {isOn(unit.active) ? t("common.yes") : t("common.no")}
                  </span>
                </Row>
                <Row label={t("units.columns.updated")}>
                  <span className="num text-xs text-muted-foreground">{formatDateTime(unit.updated_at, locale)}</span>
                </Row>
              </dl>
            </div>
            <SheetFooter className="border-t bg-muted/10 p-3.5 sm:p-4">
              <Button asChild className="w-full font-medium h-9 text-xs sm:text-sm">
                <Link href={`/units/${unit.id}`} prefetch>
                  {t("common.openFullView")}
                  <ArrowUpRight className="size-3.5 rtl:-scale-x-100" />
                </Link>
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
