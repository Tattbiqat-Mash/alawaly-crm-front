import { staffEndpoints } from "@/config/endpoints";
import { staffApi } from "@/lib/api/client";
import { unwrapList, type ListEnvelope } from "@/lib/api/envelope";
import { downloadFile } from "@/lib/api/files";
import { toSearchParams, type ListParams } from "@/lib/api/params";
import { salesApi } from "@/features/sales/api";
import { serviceApi } from "@/features/service/api";

export const EXPORTS = ["units", "sales", "payments", "service-requests"] as const;
export type ExportKind = (typeof EXPORTS)[number];

export const DOCUMENT_SOURCES = ["sale", "service_request"] as const;

/** Metadata only; the file itself opens through a signed link. */
export type DocumentRow = {
  ref: string;
  source: string;
  owner_id: number;
  type: string;
  original_name: string;
  mime: string;
  size: number;
  created_at: string | null;
};

const ep = staffEndpoints;

/**
 * `ref` is "<kind>:<id>". Assumption (D20): for sale documents `owner_id` is the sale and the ref id
 * the document; for service requests the ref id is the attachment. Other sources cannot be opened here.
 */
export function documentLink(doc: DocumentRow) {
  const id = Number(doc.ref.split(":")[1]);
  if (!Number.isFinite(id)) return null;
  if (doc.source === "sale") return () => salesApi.documentLink(doc.owner_id, id);
  if (doc.source === "service_request") return () => serviceApi.attachmentLink(id);
  return null;
}

export const dataApi = {
  download: (what: ExportKind) => downloadFile(staffApi, ep.exports(what), `${what}.csv`),
  documents: (params: ListParams) =>
    staffApi.get<ListEnvelope<DocumentRow>>(ep.documents, { params: toSearchParams(params) }).then((r) => unwrapList(r.data)),
};
