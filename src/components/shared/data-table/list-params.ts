import { parseAsInteger, parseAsString } from "nuqs";
import type { ListMeta } from "@/lib/api/envelope";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/api/params";
import type { PaginationProps } from "./table-pagination";

/** Paging and sorting kept in the URL so lists are shareable, bookmarkable and refresh-safe. */
export const listParsers = {
  page: parseAsInteger.withDefault(1),
  pageSize: parseAsInteger.withDefault(DEFAULT_PAGE_SIZE),
  sort: parseAsString,
};

export const clampPageSize = (size: number) => Math.min(Math.max(size, 1), MAX_PAGE_SIZE);

/** Table pagination wired to URL list state (`page` / `pageSize`). */
export function paginationProps(
  meta: ListMeta | undefined,
  setState: (patch: { page?: number; pageSize?: number }) => unknown,
): PaginationProps | undefined {
  if (!meta) return undefined;
  return {
    page: meta.page,
    pageSize: meta.pageSize,
    total: meta.total,
    onPageChange: (page) => setState({ page }),
    onPageSizeChange: (pageSize) => setState({ pageSize, page: 1 }),
  };
}
