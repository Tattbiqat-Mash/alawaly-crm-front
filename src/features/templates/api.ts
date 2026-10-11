import { staffEndpoints } from "@/config/endpoints";
import { staffApi } from "@/lib/api/client";
import { unwrapList, type Envelope, type ListEnvelope } from "@/lib/api/envelope";
import { idempotencyHeader } from "@/lib/api/idempotency";
import { toSearchParams, type ListParams } from "@/lib/api/params";

export type NotificationTemplate = {
  id: number;
  key: string;
  title_ar: string | null;
  title_en: string | null;
  body_ar: string | null;
  body_en: string | null;
  active: 0 | 1 | boolean;
};

export type TemplateInput = Partial<Omit<NotificationTemplate, "id" | "active"> & { active: boolean }>;

/** Placeholders named in wireframe S27, with sample values for the preview. */
export const PLACEHOLDERS: Record<string, { ar: string; en: string }> = {
  "{title}": { ar: "تسريب أسفل حوض المطبخ", en: "Leak under the kitchen sink" },
  "{scheduled_at}": { ar: "2026-11-03 09:00", en: "2026-11-03 09:00" },
  "{expires_on}": { ar: "2036-10-10", en: "2036-10-10" },
};

export const fillPlaceholders = (text: string, locale: "ar" | "en") =>
  Object.entries(PLACEHOLDERS).reduce((out, [key, sample]) => out.split(key).join(sample[locale]), text);

const ep = staffEndpoints;

export const templatesApi = {
  list: (params: ListParams) =>
    staffApi.get<ListEnvelope<NotificationTemplate>>(ep.notificationTemplates, { params: toSearchParams(params) }).then((r) => unwrapList(r.data)),
  /** A duplicate key answers 409/422. */
  create: (body: TemplateInput, key: string) =>
    staffApi.post<Envelope<NotificationTemplate>>(ep.notificationTemplates, body, { headers: idempotencyHeader(key) }).then((r) => r.data.data),
  update: (id: number, body: TemplateInput) => staffApi.patch<Envelope<NotificationTemplate>>(ep.notificationTemplate(id), body).then((r) => r.data.data),
};
