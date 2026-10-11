"use client";

import { ExternalLink, Info } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { DataTable, type Column } from "@/components/shared/data-table/data-table";
import { EmptyState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "@/i18n/navigation";
import { formatCount } from "@/lib/format/money";
import { useDuplicates } from "../hooks";
import type { DuplicateGroup } from "../types";

const DEFERRED = "deferred";

// S07 — Duplicate units (read-only). Resolution is a controlled data operation, not a button.
export function DuplicatesView() {
  const t = useTranslations();
  const locale = useLocale();
  const query = useDuplicates();

  const groups = query.data?.items ?? [];
  const total = query.data?.meta.total ?? 0;
  const deferred = groups.filter((g) => g.class === DEFERRED).length;

  const columns: Column<DuplicateGroup>[] = [
    { id: "crm", header: t("duplicates.columns.crmId"), cell: (g) => <span className="num font-medium" dir="ltr">{g.crm_unit_id}</span> },
    { id: "members", header: t("duplicates.columns.members"), align: "end", cell: (g) => <span className="num">{g.members}</span> },
    {
      id: "class",
      header: t("duplicates.columns.class"),
      cell: (g) =>
        g.class === DEFERRED ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0} className="inline-flex items-center gap-1 rounded focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none">
                <StatusBadge tone="warning">{t("duplicates.classes.deferred")}</StatusBadge>
                <Info aria-hidden className="size-3.5 text-muted-foreground" />
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">{t("duplicates.deferredHint")}</TooltipContent>
          </Tooltip>
        ) : (
          <StatusBadge tone="info">{g.class}</StatusBadge>
        ),
    },
    {
      id: "units",
      header: t("duplicates.columns.unitIds"),
      cell: (g) => (
        <div className="flex flex-wrap gap-2">
          {g.unit_ids.map((id) => (
            <Link
              key={id}
              href={`/units/${id}`}
              target="_blank"
              rel="noopener"
              className="num inline-flex items-center gap-1 text-primary hover:underline"
            >
              #{id}
              <ExternalLink aria-hidden className="size-3" />
            </Link>
          ))}
        </div>
      ),
    },
  ];

  return (
    <>
      <dl className="grid grid-cols-3 gap-3">
        {(
          [
            ["groups", total],
            ["resolvable", groups.length - deferred],
            ["decision", deferred],
          ] as const
        ).map(([key, value]) => (
          <div key={key} className="rounded-xl border bg-card p-4">
            <dt className="text-xs text-muted-foreground">{t(`duplicates.kpi.${key}`)}</dt>
            <dd className="num mt-1 text-2xl font-semibold">{query.isLoading ? <Skeleton className="h-7 w-12" /> : formatCount(value, locale)}</dd>
          </div>
        ))}
      </dl>
      <DataTable
        caption={t("duplicates.title")}
        columns={columns}
        rows={query.data?.items}
        getRowId={(g) => g.crm_unit_id}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => query.refetch()}
        empty={<EmptyState compact title={t("duplicates.empty")} />}
      />
    </>
  );
}
