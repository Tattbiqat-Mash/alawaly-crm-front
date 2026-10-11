"use client";

import { Building2, FileText, KeyRound, ShieldCheck, Wrench } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { NotFoundState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UnitStatusBadge } from "@/features/inventory/components/unit-status-badge";
import { SaleStatusBadge } from "@/features/sales/components/badges";
import { Link } from "@/i18n/navigation";
import { toApiError } from "@/lib/api/errors";
import { formatDate } from "@/lib/format/dates";
import { formatMoney } from "@/lib/format/money";
import { useMyUnit, useMyUnits } from "../hooks";
import { useEligibilityText } from "./eligibility";
import { OwnerCard, OwnerCardTitle, OwnerEmpty, OwnerError, OwnerFacts, OwnerList, OwnerListSkeleton, OwnerRow } from "./owner-ui";

export function useUnitName() {
  const t = useTranslations("units.detail");
  return (u: { id: number; unit_number?: string | null }) => t("titleNumber", { number: u.unit_number ?? `#${u.id}` });
}

// O04 — My units (recorded ownership only).
export function OwnerUnitsView() {
  const t = useTranslations();
  const locale = useLocale();
  const unitName = useUnitName();
  const units = useMyUnits();

  if (units.isLoading) return <OwnerListSkeleton />;
  if (units.error) return <OwnerError error={units.error} onRetry={() => units.refetch()} />;
  const items = units.data?.items ?? [];

  return (
    <div className="grid gap-3">
      {items.length === 0 ? (
        <OwnerEmpty icon={Building2} title={t("ownerPortal.units.empty")} description={t("ownerPortal.units.missingHint")} />
      ) : (
        <>
          <OwnerList>
            {items.map((u) => (
              <OwnerRow
                key={u.id}
                href={`/owner/units/${u.id}`}
                title={<span className="num">{unitName(u)}</span>}
                subtitle={
                  <span className="num">
                    {u.unit_code && <span className="font-mono">{u.unit_code} · </span>}
                    {u.owned_since && t("ownerPortal.units.ownedSince", { date: formatDate(u.owned_since, locale) })}
                    {u.ownership_source === "transfer" && ` (${t("statuses.ownershipSource.transfer")})`}
                  </span>
                }
                trailing={<UnitStatusBadge status={u.status} />}
              />
            ))}
          </OwnerList>
          <p className="px-1 text-xs text-muted-foreground">{t("ownerPortal.units.missingHint")}</p>
        </>
      )}
    </div>
  );
}

// O05 — Unit detail with purchase summary, eligibility and service shortcuts.
export function OwnerUnitDetail({ id }: { id: number }) {
  const t = useTranslations();
  const locale = useLocale();
  const text = useEligibilityText();
  const query = useMyUnit(id);

  if (query.isLoading) return <Skeleton className="h-72 w-full rounded-2xl" />;
  if (query.error) {
    if (toApiError(query.error).code === "NOT_FOUND")
      return (
        <OwnerCard className="p-0">
          <NotFoundState compact />
        </OwnerCard>
      );
    return <OwnerError error={query.error} onRetry={() => query.refetch()} />;
  }
  const u = query.data!;
  const e = u.eligibility;
  const area = u.total_area ? `${Number(u.total_area).toLocaleString(locale === "ar" ? "ar-SA-u-nu-latn" : "en")} ${t("ownerPortal.units.sqm")}` : "—";

  return (
    <div className="grid gap-3.5">
      <OwnerCard>
        <div className="mb-3 flex items-center justify-between gap-2">
          {u.unit_code && <span className="font-mono text-xs text-muted-foreground">{u.unit_code}</span>}
          <UnitStatusBadge status={u.status} />
        </div>
        <OwnerFacts
          items={[
            [t("ownerPortal.units.area"), <span key="a" className="num">{area}</span>],
            [t("ownerPortal.units.rooms"), <span key="r" className="num">{u.rooms ?? "—"}{u.bathrooms ? ` · ${t("ownerPortal.units.baths", { count: u.bathrooms })}` : ""}</span>],
            [t("ownerPortal.units.floor"), <span key="f" className="num">{u.floor_num ?? "—"}</span>],
            [t("ownerPortal.units.ownedSinceLabel"), <span key="o" className="num">{formatDate(u.owned_since, locale)}</span>],
          ]}
        />
      </OwnerCard>

      {u.sale && (
        <OwnerCard>
          <OwnerCardTitle icon={FileText} action={<SaleStatusBadge status={u.sale.status} />}>
            {t("ownerPortal.units.purchase")}
          </OwnerCardTitle>
          <p className="num text-xl font-bold">{formatMoney(u.sale.price_agreed, locale)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/owner/sales/${u.sale.id}`}>{t("ownerPortal.units.viewPurchase")}</Link>
            </Button>
            {(u.sale.status === "contracted" || u.sale.status === "paid_up" || u.sale.status === "handed_over") && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/owner/handover/${u.sale.id}`}>
                  <KeyRound data-icon="inline-start" />
                  {t("ownerPortal.units.viewHandover")}
                </Link>
              </Button>
            )}
          </div>
        </OwnerCard>
      )}

      <OwnerCard>
        <OwnerCardTitle icon={ShieldCheck}>{t("ownerPortal.units.services")}</OwnerCardTitle>
        {!e ? (
          <p className="text-sm text-muted-foreground">{t("units.eligibility.noOwner")}</p>
        ) : (
          <div className="grid gap-3">
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone={e.after_sales ? "success" : "neutral"}>
                {t("units.eligibility.afterSales")}: {e.after_sales ? t("units.eligibility.eligible") : t("units.eligibility.notEligible")}
              </StatusBadge>
              <StatusBadge tone={e.warranty ? "success" : "neutral"}>
                {t("units.eligibility.warranty")}: {e.warranty ? t("units.eligibility.eligible") : t("units.eligibility.notEligible")}
              </StatusBadge>
            </div>
            {e.warranties.length > 0 && (
              <ul className="grid gap-1 text-sm">
                {e.warranties.map((w) => (
                  <li key={w.id} className="num">
                    {text.category(w.category)} · {t("units.eligibility.until", { date: formatDate(w.expires_on, locale) })}
                  </li>
                ))}
              </ul>
            )}
            {e.reasons.length > 0 && <p className="text-xs text-muted-foreground">{e.reasons.map(text.reason).join(" · ")}</p>}
            <div className="grid gap-2 sm:grid-cols-2">
              <ShortcutButton href={`/owner/requests/new?unit=${u.id}`} enabled={e.after_sales} icon={<Wrench data-icon="inline-start" />} label={t("ownerPortal.units.requestService")} />
              <ShortcutButton
                href={`/owner/requests/new?unit=${u.id}&kind=warranty`}
                enabled={e.warranty}
                icon={<ShieldCheck data-icon="inline-start" />}
                label={t("ownerPortal.units.warrantyClaim")}
                variant="outline"
              />
            </div>
            {u.ownership_source === "transfer" && <p className="text-xs text-muted-foreground">{t("ownerPortal.units.resaleNote")}</p>}
          </div>
        )}
      </OwnerCard>
    </div>
  );
}

/** Disabled shortcuts stay visible; the reasons above explain why. */
function ShortcutButton({ href, enabled, icon, label, variant = "default" }: { href: string; enabled: boolean; icon: React.ReactNode; label: string; variant?: "default" | "outline" }) {
  if (!enabled)
    return (
      <Button variant={variant} className="h-11" disabled>
        {icon}
        {label}
      </Button>
    );
  return (
    <Button asChild variant={variant} className="h-11">
      <Link href={href}>
        {icon}
        {label}
      </Link>
    </Button>
  );
}
