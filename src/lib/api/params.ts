// List parameters as the API expects them:
// page (from 1), pageSize (max 100), sort=field|-field, filter[field]=value (array = "any of").

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 25;

type Scalar = string | number | boolean;
type FilterValue = Scalar | readonly Scalar[] | null | undefined;

export type ListParams = {
  page?: number;
  pageSize?: number;
  sort?: string | null;
  filter?: Record<string, FilterValue>;
  /** Plain parameters some lists accept (q, price_min, price_max, overdue, client_id…). */
  extra?: Record<string, Scalar | null | undefined>;
};

const isBlank = (v: unknown) => v === null || v === undefined || v === "";

export function toSearchParams({ page, pageSize, sort, filter, extra }: ListParams): URLSearchParams {
  const params = new URLSearchParams();
  if (page) params.set("page", String(page));
  if (pageSize) params.set("pageSize", String(Math.min(pageSize, MAX_PAGE_SIZE)));
  if (sort) params.set("sort", sort);

  for (const [field, value] of Object.entries(filter ?? {})) {
    if (isBlank(value)) continue;
    if (Array.isArray(value)) {
      for (const v of value) params.append(`filter[${field}][]`, String(v));
    } else {
      params.set(`filter[${field}]`, String(value));
    }
  }
  for (const [key, value] of Object.entries(extra ?? {})) {
    if (!isBlank(value)) params.set(key, String(value));
  }
  return params;
}
