import { parseAsInteger, parseAsString } from "nuqs";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/api/params";

/** Paging and sorting kept in the URL so lists are shareable, bookmarkable and refresh-safe. */
export const listParsers = {
  page: parseAsInteger.withDefault(1),
  pageSize: parseAsInteger.withDefault(DEFAULT_PAGE_SIZE),
  sort: parseAsString,
};

export const clampPageSize = (size: number) => Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
