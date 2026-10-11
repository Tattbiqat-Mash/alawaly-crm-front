import { staffEndpoints } from "@/config/endpoints";
import { staffApi } from "@/lib/api/client";
import type { Envelope } from "@/lib/api/envelope";
import { idempotencyHeader } from "@/lib/api/idempotency";

export type ImportRow = Record<string, string>;

/** A reported row. Only `row`, `crm_unit_id` and `reason` are recorded in the guide; the rest is defensive. */
export type ImportIssue = {
  row?: number;
  crm_unit_id?: string | null;
  reason?: string;
  message?: string;
  errors?: Record<string, string[]> | string[];
  unit_ids?: number[];
};

export type ImportResult = {
  dry_run: boolean;
  payload_hash: string;
  valid: number;
  invalid: ImportIssue[];
  skipped: ImportIssue[];
  ambiguous_matches: ImportIssue[];
  applied?: number;
};

export const unitImportApi = {
  /** dry_run defaults to true on the API. */
  dryRun: (rows: ImportRow[]) =>
    staffApi.post<Envelope<ImportResult>>(staffEndpoints.unitsImport, { rows }).then((r) => r.data.data),
  /** The commit is idempotent by payload hash; the key also protects a retried click. */
  commit: (rows: ImportRow[], idempotencyKey: string) =>
    staffApi
      .post<Envelope<ImportResult>>(staffEndpoints.unitsImport, { rows }, { params: { dry_run: 0 }, headers: idempotencyHeader(idempotencyKey) })
      .then((r) => r.data.data),
};

/** Prices change only through the four-eyes approval flow, never by import. */
export const PRICE_COLUMNS = [
  "price_in_tax",
  "price_ex_tax",
  "price_total",
  "promotion_price",
  "reservation_amount",
  "price_meter_ex_tax",
  "price_meter_in_tax",
];

export const MAX_IMPORT_ROWS = 1000;

export function issueText(issue: ImportIssue): string {
  if (issue.reason) return issue.reason;
  if (issue.message) return issue.message;
  if (Array.isArray(issue.errors)) return issue.errors.join(" · ");
  if (issue.errors) return Object.entries(issue.errors).map(([field, msgs]) => `${field}: ${msgs.join(", ")}`).join(" · ");
  if (issue.unit_ids) return issue.unit_ids.map((id) => `#${id}`).join(", ");
  return "—";
}
