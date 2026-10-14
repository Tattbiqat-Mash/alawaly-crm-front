"use client";

import { Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FloorInput, UnitTemplate } from "@/features/inventory/types";
import { localizedName } from "@/lib/format/localized";
import { useTemplateOptions } from "../hooks";

/** The API accepts at most 500 units per request. */
export const MAX_UNITS_PER_REQUEST = 500;

type TemplateRow = { key: string; template_id: string; count: string };
/** One floor, or a range of floors repeating the same layout. */
export type FloorRow = { key: string; range: boolean; floor: string; to: string; templates: TemplateRow[] };

const newKey = () => crypto.randomUUID();
const newTemplate = (): TemplateRow => ({ key: newKey(), template_id: "", count: "1" });
export const newFloorRow = (floor = ""): FloorRow => ({ key: newKey(), range: false, floor, to: "", templates: [newTemplate()] });

const isWhole = (v: string) => /^\d+$/.test(v.trim());
/** Floor numbers may be negative (basements). */
const isFloor = (v: string) => /^-?\d+$/.test(v.trim());
const floorsIn = (row: FloorRow) =>
  row.range && isFloor(row.floor) && isFloor(row.to) ? Math.max(0, Number(row.to) - Number(row.floor) + 1) : 1;

export const rowInvalid = (row: FloorRow) =>
  !isFloor(row.floor) ||
  (row.range && (!isFloor(row.to) || Number(row.to) < Number(row.floor))) ||
  row.templates.length === 0 ||
  row.templates.some((tpl) => !tpl.template_id || !isWhole(tpl.count) || Number(tpl.count) < 1);

/** Units the rows will create (floors × template counts). */
export const unitsToCreate = (rows: FloorRow[]) =>
  rows.reduce((sum, row) => sum + floorsIn(row) * row.templates.reduce((n, tpl) => n + (isWhole(tpl.count) ? Number(tpl.count) : 0), 0), 0);

/** Highest floor the rows use (to grow floors_count). */
export const highestFloor = (rows: FloorRow[]) =>
  rows.reduce((max, row) => Math.max(max, Number(row.range ? row.to : row.floor) || 0), 0);

export const toFloorInputs = (rows: FloorRow[]): FloorInput[] =>
  rows.map((row) => ({
    ...(row.range ? { floor_from: Number(row.floor), floor_to: Number(row.to) } : { floor_num: Number(row.floor) }),
    templates: row.templates.map((tpl) => ({ template_id: Number(tpl.template_id), count: Number(tpl.count) })),
  }));

export const templateLabel = (tpl: Pick<UnitTemplate, "id" | "style_code" | "nameAr" | "nameEn"> | undefined, locale: string) =>
  tpl ? [tpl.style_code, localizedName(tpl, locale)].filter(Boolean).join(" · ") || `#${tpl.id}` : "";

/** Rows of floors, each with the unit templates (and how many of each) placed on it. */
export function FloorsEditor({
  rows,
  onChange,
  showErrors,
  disabled,
}: {
  rows: FloorRow[];
  onChange: (rows: FloorRow[]) => void;
  /** Mark incomplete rows (after a submit attempt). */
  showErrors: boolean;
  disabled?: boolean;
}) {
  const t = useTranslations("buildings.floorsEditor");
  const locale = useLocale();
  const templates = useTemplateOptions();

  const update = (key: string, patch: Partial<FloorRow>) => onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const updateTemplate = (row: FloorRow, tplKey: string, patch: Partial<TemplateRow>) =>
    update(row.key, { templates: row.templates.map((tpl) => (tpl.key === tplKey ? { ...tpl, ...patch } : tpl)) });
  const nextFloor = () => String(rows.length === 0 ? 0 : highestFloor(rows) + 1);
  const total = unitsToCreate(rows);

  return (
    <div className="grid gap-3">
      {rows.map((row, i) => {
        const invalid = showErrors && rowInvalid(row);
        return (
          <fieldset key={row.key} className={`grid gap-2.5 rounded-lg border p-3 ${invalid ? "border-destructive/60" : ""}`} disabled={disabled}>
            <legend className="sr-only">{t("floorRow", { n: i + 1 })}</legend>
            <div className="flex flex-wrap items-end gap-2">
              <label className="grid gap-1 text-xs font-semibold">
                {row.range ? t("from") : t("floor")}
                <Input
                  value={row.floor}
                  onChange={(e) => update(row.key, { floor: e.target.value })}
                  inputMode="numeric"
                  dir="ltr"
                  className="h-8 w-20"
                  aria-invalid={showErrors && !isFloor(row.floor) ? true : undefined}
                />
              </label>
              {row.range && (
                <label className="grid gap-1 text-xs font-semibold">
                  {t("to")}
                  <Input
                    value={row.to}
                    onChange={(e) => update(row.key, { to: e.target.value })}
                    inputMode="numeric"
                    dir="ltr"
                    className="h-8 w-20"
                    aria-invalid={showErrors && (!isFloor(row.to) || Number(row.to) < Number(row.floor)) ? true : undefined}
                  />
                </label>
              )}
              <Button type="button" variant="ghost" size="sm" onClick={() => update(row.key, { range: !row.range, to: row.range ? "" : row.floor })}>
                {row.range ? t("singleFloor") : t("floorRange")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="ms-auto"
                onClick={() => onChange(rows.filter((r) => r.key !== row.key))}
                aria-label={t("removeFloor")}
              >
                <Trash2 />
              </Button>
            </div>
            {row.templates.map((tpl) => (
              <div key={tpl.key} className="grid grid-cols-[1fr_5rem_auto] items-center gap-2">
                <Select value={tpl.template_id} onValueChange={(v) => updateTemplate(row, tpl.key, { template_id: v })} disabled={disabled}>
                  <SelectTrigger className="h-8 w-full" aria-label={t("template")} aria-invalid={showErrors && !tpl.template_id ? true : undefined}>
                    <SelectValue placeholder={templates.isLoading ? t("loadingTemplates") : t("chooseTemplate")} />
                  </SelectTrigger>
                  <SelectContent>
                    {(templates.data ?? []).map((option) => (
                      <SelectItem key={option.id} value={String(option.id)}>
                        {templateLabel(option, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={tpl.count}
                  onChange={(e) => updateTemplate(row, tpl.key, { count: e.target.value })}
                  inputMode="numeric"
                  dir="ltr"
                  className="h-8"
                  aria-label={t("count")}
                  aria-invalid={showErrors && (!isWhole(tpl.count) || Number(tpl.count) < 1) ? true : undefined}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => update(row.key, { templates: row.templates.filter((x) => x.key !== tpl.key) })}
                  aria-label={t("removeTemplate")}
                  disabled={row.templates.length === 1}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="justify-self-start"
              onClick={() => update(row.key, { templates: [...row.templates, newTemplate()] })}
            >
              <Plus data-icon="inline-start" />
              {t("addTemplate")}
            </Button>
          </fieldset>
        );
      })}
      {templates.data?.length === 0 && <p className="text-xs text-muted-foreground">{t("noTemplates")}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...rows, newFloorRow(nextFloor())])} disabled={disabled}>
          <Plus data-icon="inline-start" />
          {t("addFloor")}
        </Button>
        {rows.length > 0 && (
          <span className={`num text-xs ${total > MAX_UNITS_PER_REQUEST ? "font-semibold text-destructive" : "text-muted-foreground"}`}>
            {t("unitsTotal", { count: total, max: MAX_UNITS_PER_REQUEST })}
          </span>
        )}
      </div>
    </div>
  );
}
