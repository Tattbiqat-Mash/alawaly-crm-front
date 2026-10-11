"use client";

import { ArrowRight, CircleCheck, CircleX } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { TablePagination } from "@/components/shared/data-table/table-pagination";
import { EmptyState, ErrorState, ForbiddenState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { isOwnershipSource, isPriceChangeStatus, isStatusSource, priceChangeTone } from "@/config/statuses";
import type { Paginated } from "@/lib/api/envelope";
import { formatDate, formatDateTime } from "@/lib/format/dates";
import { formatMoney } from "@/lib/format/money";
import { useUnitAvailability, useUnitEligibility, useUnitOwnership, useUnitPriceChanges, useUnitStatusHistory } from "../hooks";
import { PRICE_FIELDS, type PriceField } from "../types";
import { UnitStatusBadge } from "./unit-status-badge";

type GatedQuery<T> = {
  allowed: boolean;
  data: T | undefined;
  isLoading: boolean;
  error: unknown;
  refetch: () => unknown;
};

/** Shared loading / forbidden / error / empty handling for the tab panels. */
function TabState<T>({
  query,
  isEmpty,
  empty,
  children,
}: {
  query: GatedQuery<T>;
  isEmpty: (data: T) => boolean;
  empty: string;
  children: (data: T) => ReactNode;
}) {
  if (!query.allowed) return <ForbiddenState compact />;
  if (query.isLoading) return <Skeleton className="h-40 w-full" />;
  if (query.error) return <ErrorState compact error={query.error} onRetry={() => query.refetch()} />;
  if (!query.data || isEmpty(query.data)) return <EmptyState compact title={empty} />;
  return <>{children(query.data)}</>;
}

const isEmptyPage = <T,>(p: Paginated<T>) => p.items.length === 0;

function Paged<T>({ page, data, onPage, children }: { page: number; data: Paginated<T>; onPage: (p: number) => void; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="overflow-x-auto">{children}</div>
      {data.meta.total > data.meta.pageSize && (
        <TablePagination page={page} pageSize={data.meta.pageSize} total={data.meta.total} onPageChange={onPage} onPageSizeChange={() => {}} />
      )}
    </div>
  );
}

export function StatusHistoryTab({ unitId }: { unitId: number }) {
  const t = useTranslations();
  const locale = useLocale();
  const [page, setPage] = useState(1);
  const query = useUnitStatusHistory(unitId, page);

  return (
    <TabState query={query} isEmpty={isEmptyPage} empty={t("units.history.empty")}>
      {(data) => (
        <Paged page={page} data={data} onPage={setPage}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("units.history.when")}</TableHead>
                <TableHead>{t("units.history.change")}</TableHead>
                <TableHead>{t("units.history.source")}</TableHead>
                <TableHead>{t("units.history.reason")}</TableHead>
                <TableHead>{t("units.history.by")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="num">{formatDateTime(h.created_at, locale)}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5">
                      <UnitStatusBadge status={h.from_status} />
                      <ArrowRight aria-hidden className="size-3.5 text-muted-foreground rtl:rotate-180" />
                      <UnitStatusBadge status={h.to_status} />
                    </span>
                  </TableCell>
                  <TableCell>{isStatusSource(h.source) ? t(`statuses.statusSource.${h.source}`) : h.source}</TableCell>
                  <TableCell className="max-w-64 truncate whitespace-normal">{h.reason ?? "—"}</TableCell>
                  <TableCell className="num">{h.actor_id ? t("units.history.staffId", { id: h.actor_id }) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paged>
      )}
    </TabState>
  );
}

export function PricesTab({ unitId }: { unitId: number }) {
  const t = useTranslations();
  const locale = useLocale();
  const [page, setPage] = useState(1);
  const query = useUnitPriceChanges(unitId, page);
  const fieldLabel = (f: string) => (PRICE_FIELDS.includes(f as PriceField) ? t(`units.priceDialog.fields.${f as PriceField}`) : f);

  return (
    <TabState query={query} isEmpty={isEmptyPage} empty={t("units.prices.empty")}>
      {(data) => (
        <Paged page={page} data={data} onPage={setPage}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("units.prices.field")}</TableHead>
                <TableHead className="text-end">{t("units.prices.old")}</TableHead>
                <TableHead className="text-end">{t("units.prices.new")}</TableHead>
                <TableHead>{t("units.prices.status")}</TableHead>
                <TableHead>{t("units.prices.requestedBy")}</TableHead>
                <TableHead>{t("units.prices.effective")}</TableHead>
                <TableHead>{t("units.prices.requested")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{fieldLabel(p.field)}</TableCell>
                  <TableCell className="num text-end text-muted-foreground">{formatMoney(p.old_value, locale)}</TableCell>
                  <TableCell className="num text-end font-medium">{formatMoney(p.new_value, locale)}</TableCell>
                  <TableCell>
                    {isPriceChangeStatus(p.status) ? (
                      <StatusBadge tone={priceChangeTone[p.status]}>{t(`statuses.priceChange.${p.status}`)}</StatusBadge>
                    ) : (
                      <StatusBadge>{p.status}</StatusBadge>
                    )}
                  </TableCell>
                  <TableCell className="num">{p.requested_by ? t("units.history.staffId", { id: p.requested_by }) : "—"}</TableCell>
                  <TableCell className="num">{formatDate(p.effective_from, locale)}</TableCell>
                  <TableCell className="num">{formatDateTime(p.created_at, locale)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paged>
      )}
    </TabState>
  );
}

export function OwnershipTab({ unitId }: { unitId: number }) {
  const t = useTranslations();
  const locale = useLocale();
  const query = useUnitOwnership(unitId);

  return (
    <TabState query={query} isEmpty={isEmptyPage} empty={t("units.ownership.empty")}>
      {(data) => (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("units.ownership.client")}</TableHead>
                <TableHead>{t("units.ownership.since")}</TableHead>
                <TableHead>{t("units.ownership.until")}</TableHead>
                <TableHead>{t("units.ownership.source")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="num">{t("units.ownership.clientId", { id: o.client_id })}</TableCell>
                  <TableCell className="num">{formatDate(o.from_date, locale)}</TableCell>
                  <TableCell className="num">
                    {o.to_date ? formatDate(o.to_date, locale) : <StatusBadge tone="success">{t("units.ownership.current")}</StatusBadge>}
                  </TableCell>
                  <TableCell>{isOwnershipSource(o.source) ? t(`statuses.ownershipSource.${o.source}`) : o.source}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </TabState>
  );
}

const ELIGIBILITY_REASONS = [
  "NO_RECORDED_OWNER",
  "NOT_CURRENT_OWNER",
  "NO_ALAWALY_SALE_RECORD",
  "NO_ACTIVE_WARRANTY",
  "WARRANTY_TRANSFER_UNDECIDED",
  "WARRANTY_NOT_TRANSFERABLE",
] as const;
const WARRANTY_CATEGORIES = ["structural", "finishing", "plumbing", "electrical", "hvac", "appliances", "other"] as const;

function Verdict({ label, ok }: { label: string; ok: boolean }) {
  const t = useTranslations("units.eligibility");
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <span className="text-sm">{label}</span>
      <span className={ok ? "inline-flex items-center gap-1 text-sm text-success" : "inline-flex items-center gap-1 text-sm text-destructive"}>
        {ok ? <CircleCheck aria-hidden className="size-4" /> : <CircleX aria-hidden className="size-4" />}
        {ok ? t("eligible") : t("notEligible")}
      </span>
    </div>
  );
}

/** Eligibility is checked for the current recorded owner (from the ownership history). */
export function EligibilityTab({ unitId }: { unitId: number }) {
  const t = useTranslations();
  const locale = useLocale();
  const ownership = useUnitOwnership(unitId);
  const currentOwner = ownership.data?.items.find((o) => o.to_date === null)?.client_id ?? null;
  const query = useUnitEligibility(unitId, currentOwner);

  if (ownership.allowed && !ownership.isLoading && !ownership.error && currentOwner === null) {
    return <EmptyState compact title={t("units.eligibility.noOwner")} />;
  }
  if (ownership.isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <TabState query={query} isEmpty={() => false} empty="">
      {(e) => (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Verdict label={t("units.eligibility.afterSales")} ok={e.after_sales} />
            <Verdict label={t("units.eligibility.warranty")} ok={e.warranty} />
            {e.reasons.length > 0 && (
              <ul className="list-disc space-y-1 ps-5 text-sm text-muted-foreground">
                {e.reasons.map((r) => (
                  <li key={r}>
                    {ELIGIBILITY_REASONS.includes(r as (typeof ELIGIBILITY_REASONS)[number])
                      ? t(`units.eligibility.reasons.${r as (typeof ELIGIBILITY_REASONS)[number]}`)
                      : r}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {e.warranties.length > 0 && (
            <div className="rounded-lg border p-3">
              <p className="mb-2 text-sm font-medium">{t("units.eligibility.warranties")}</p>
              <ul className="divide-y text-sm">
                {e.warranties.map((w) => (
                  <li key={w.id} className="flex justify-between py-2">
                    <span>
                      {WARRANTY_CATEGORIES.includes(w.category as (typeof WARRANTY_CATEGORIES)[number])
                        ? t(`units.eligibility.categories.${w.category as (typeof WARRANTY_CATEGORIES)[number]}`)
                        : w.category}
                    </span>
                    <span className="num text-muted-foreground">{t("units.eligibility.until", { date: formatDate(w.expires_on, locale) })}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </TabState>
  );
}

const AVAILABILITY_REASONS = ["UNIT_INACTIVE", "ACTIVE_RESERVATION_EXISTS"] as const;

export function AvailabilityCard({ unitId }: { unitId: number }) {
  const t = useTranslations();
  const locale = useLocale();
  const query = useUnitAvailability(unitId);
  if (!query.allowed) return null;

  return (
    <section className="rounded-xl border bg-card p-4">
      <h2 className="mb-3 text-sm font-medium">{t("units.availability.title")}</h2>
      {query.isLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : query.error ? (
        <ErrorState compact error={query.error} onRetry={() => query.refetch()} />
      ) : query.data ? (
        <dl className="grid gap-2 text-sm">
          <div className="flex items-center gap-2">
            {query.data.available ? (
              <CircleCheck aria-hidden className="size-4 text-success" />
            ) : (
              <CircleX aria-hidden className="size-4 text-destructive" />
            )}
            <span className="font-medium">{query.data.available ? t("units.availability.available") : t("units.availability.notAvailable")}</span>
          </div>
          {query.data.reasons.length > 0 && (
            <ul className="list-disc ps-5 text-muted-foreground">
              {query.data.reasons.map((r) => (
                <li key={r}>
                  {AVAILABILITY_REASONS.includes(r as (typeof AVAILABILITY_REASONS)[number])
                    ? t(`units.availability.reasons.${r as (typeof AVAILABILITY_REASONS)[number]}`)
                    : r}
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-between border-t pt-2">
            <dt className="text-muted-foreground">{t("units.availability.fee")}</dt>
            <dd className="num">{formatMoney(query.data.reservation_amount, locale)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t("units.availability.hold")}</dt>
            <dd className="num">{query.data.hold_hours === null ? "—" : t("units.availability.holdHours", { hours: query.data.hold_hours })}</dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}
