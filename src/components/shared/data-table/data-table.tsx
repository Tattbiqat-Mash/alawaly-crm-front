"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useTranslations } from "next-intl";
import type { KeyboardEvent, ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ErrorState } from "../states";
import { TablePagination, type PaginationProps } from "./table-pagination";

export type Column<T> = {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** API sort field; makes the header a sort toggle. */
  sortKey?: string;
  align?: "start" | "end";
  className?: string;
};

type SortProps = { value: string | null; onChange: (value: string | null) => void };

type DataTableProps<T> = {
  caption: string;
  columns: Column<T>[];
  rows: T[] | undefined;
  getRowId: (row: T) => string | number;
  /** Accessible name of a row, announced when it receives focus. */
  getRowLabel?: (row: T) => string;
  isLoading: boolean;
  /** Background refetch while previous rows stay visible. */
  isFetching?: boolean;
  error?: unknown;
  onRetry?: () => void;
  empty: ReactNode;
  onRowClick?: (row: T) => void;
  onRowIntent?: (row: T) => void;
  sort?: SortProps;
  pagination?: PaginationProps;
};

/** none → ascending → descending → none, using the API's sort=field / sort=-field. */
const nextSort = (current: string | null, key: string) =>
  current === key ? `-${key}` : current === `-${key}` ? null : key;

/**
 * Height-filling data table (rules §13.1): fills the space under the page header, keeps the
 * header row sticky, scrolls rows internally and pins the pagination footer.
 */
export function DataTable<T>({
  caption,
  columns,
  rows,
  getRowId,
  getRowLabel,
  isLoading,
  isFetching,
  error,
  onRetry,
  empty,
  onRowClick,
  onRowIntent,
  sort,
  pagination,
}: DataTableProps<T>) {
  const t = useTranslations("table");
  const showSkeleton = isLoading && !rows;
  const showError = Boolean(error) && !rows?.length;
  const showEmpty = !showSkeleton && !showError && rows?.length === 0;

  const onRowKeyDown = (e: KeyboardEvent<HTMLTableRowElement>, row: T) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onRowClick?.(row);
    }
  };

  return (
    <div className="relative flex h-full min-h-[380px] flex-1 flex-col overflow-hidden rounded-xl border bg-card">
      {isFetching && !showSkeleton && (
        <div aria-hidden className="absolute inset-x-0 top-0 z-20 h-0.5 overflow-hidden bg-primary/10">
          <div className="h-full w-1/3 animate-[progress_1s_ease-in-out_infinite] bg-primary" />
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-auto" aria-busy={isLoading || isFetching}>
        <table className="w-full caption-bottom text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 z-10 bg-card shadow-[inset_0_-1px_0_var(--border)]">
            <tr>
              {columns.map((col) => {
                const active = sort && col.sortKey && (sort.value === col.sortKey || sort.value === `-${col.sortKey}`);
                const descending = active && sort?.value?.startsWith("-");
                return (
                  <th
                    key={col.id}
                    scope="col"
                    aria-sort={active ? (descending ? "descending" : "ascending") : undefined}
                    className={cn(
                      "h-10 px-3 text-start align-middle text-xs font-medium whitespace-nowrap text-muted-foreground",
                      col.align === "end" && "text-end",
                      col.className,
                    )}
                  >
                    {sort && col.sortKey ? (
                      <button
                        type="button"
                        onClick={() => sort.onChange(nextSort(sort.value, col.sortKey!))}
                        className="-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                        aria-label={t("sortBy", { column: col.header })}
                      >
                        {col.header}
                        {active ? (
                          descending ? (
                            <ArrowDown aria-hidden className="size-3.5" />
                          ) : (
                            <ArrowUp aria-hidden className="size-3.5" />
                          )
                        ) : (
                          <ArrowUpDown aria-hidden className="size-3.5 opacity-40" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className={cn(isFetching && !showSkeleton && "opacity-70 transition-opacity")}>
            {showSkeleton &&
              Array.from({ length: 8 }, (_, i) => (
                <tr key={i} className="border-b last:border-0">
                  {columns.map((col) => (
                    <td key={col.id} className="px-3 py-3">
                      <Skeleton className="h-4 w-full max-w-32" />
                    </td>
                  ))}
                </tr>
              ))}
            {!showSkeleton &&
              !showError &&
              rows?.map((row) => (
                <tr
                  key={getRowId(row)}
                  tabIndex={onRowClick ? 0 : undefined}
                  aria-label={getRowLabel?.(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={onRowClick ? (e) => onRowKeyDown(e, row) : undefined}
                  onPointerEnter={onRowIntent ? () => onRowIntent(row) : undefined}
                  onFocus={onRowIntent ? () => onRowIntent(row) : undefined}
                  className={cn(
                    "border-b transition-colors last:border-0 hover:bg-muted/50",
                    onRowClick && "cursor-pointer focus-visible:bg-accent focus-visible:outline-none",
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.id}
                      className={cn("px-3 py-2.5 align-middle whitespace-nowrap", col.align === "end" && "text-end", col.className)}
                    >
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
        {showError && <ErrorState error={error} onRetry={onRetry} compact />}
        {showEmpty && empty}
      </div>
      {pagination && <TablePagination {...pagination} />}
    </div>
  );
}
