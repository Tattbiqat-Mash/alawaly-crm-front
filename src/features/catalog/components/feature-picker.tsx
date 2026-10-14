"use client";

import { Loader2, Plus, Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/features/auth/hooks";
import type { FeatureType, NamedRef } from "@/features/inventory/types";
import { useErrorMessage } from "@/hooks/use-error-message";
import { localizedName } from "@/lib/format/localized";
import { cn } from "@/lib/utils";
import { useFeatureOptions, useSaveFeature } from "../hooks";

const ARABIC = /[؀-ۿ]/;

/**
 * Pick features of one type from the catalogue, with a quick add that creates a feature and
 * selects it in one step. Lives inside forms: nothing here submits the surrounding form.
 */
export function FeaturePicker({
  id,
  type,
  value,
  onChange,
  known = [],
  disabled,
}: {
  id: string;
  type: FeatureType;
  value: number[];
  onChange: (ids: number[]) => void;
  /** Names for selected ids that are no longer in the active catalogue (retired features). */
  known?: NamedRef[];
  disabled?: boolean;
}) {
  const t = useTranslations("features");
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const { can } = usePermissions();
  const options = useFeatureOptions(type);
  const save = useSaveFeature();
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState<null | { nameAr: string; nameEn: string }>(null);

  const all = [...(options.data ?? []), ...known.filter((k) => !options.data?.some((o) => o.id === k.id))];
  const label = (fid: number) => localizedName(all.find((f) => f.id === fid), locale) || `#${fid}`;
  const term = search.trim().toLowerCase();
  const visible = (options.data ?? []).filter(
    (f) => !term || [f.nameAr, f.nameEn].some((n) => n?.toLowerCase().includes(term)),
  );
  // Selected but not in the active catalogue: the API refuses retired ids, so they are flagged for removal.
  const isRetired = (fid: number) => options.isSuccess && !options.data.some((f) => f.id === fid);
  const retiredCount = value.filter(isRetired).length;
  const toggle = (fid: number) => onChange(value.includes(fid) ? value.filter((v) => v !== fid) : [...value, fid]);

  const startAdding = () => {
    const text = search.trim();
    setAdding(ARABIC.test(text) ? { nameAr: text, nameEn: "" } : { nameAr: "", nameEn: text });
  };
  const canSubmitNew = Boolean(adding?.nameAr.trim() && adding?.nameEn.trim());
  const submitNew = () => {
    if (!adding || !canSubmitNew) return;
    save.mutate(
      { id: null, body: { nameAr: adding.nameAr.trim(), nameEn: adding.nameEn.trim(), feature_type: type } },
      {
        onSuccess: (created) => {
          onChange([...value, created.id]);
          setAdding(null);
          setSearch("");
          toast.success(t("added", { name: localizedName(created, locale) }));
        },
        onError: (e) => toast.error(errorMessage(e)),
      },
    );
  };
  // Enter inside the picker must never submit the surrounding form.
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>, action: () => void) => {
    if (e.key === "Enter") {
      e.preventDefault();
      action();
    }
  };

  return (
    <div className="grid gap-2 rounded-lg border p-2.5">
      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label={t("selected")}>
          {value.map((fid) => (
            <li
              key={fid}
              className={cn(
                "flex items-center gap-1 rounded-full border py-0.5 ps-2.5 pe-1 text-xs",
                isRetired(fid) ? "border-dashed border-warning/60 bg-warning/10 text-muted-foreground line-through" : "bg-primary/5",
              )}
              title={isRetired(fid) ? t("retired") : undefined}
            >
              {label(fid)}
              {isRetired(fid) && <span className="sr-only">{t("retired")}</span>}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => toggle(fid)}
                  className="grid size-4.5 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={t("remove", { name: label(fid) })}
                >
                  <X className="size-3" />
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">{t("noneSelected")}</p>
      )}
      {retiredCount > 0 && <p className="text-xs text-warning">{t("retiredHint", { count: retiredCount })}</p>}
      {!disabled && (
        <>
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id={id}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => onKeyDown(e, () => visible.length === 0 && can("inventory.edit") && startAdding())}
              placeholder={t("search")}
              className="h-8 ps-8 text-xs"
              aria-label={t("search")}
            />
          </div>
          <div className="max-h-44 overflow-y-auto">
            {options.isLoading ? (
              <div className="grid gap-1.5 p-1">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-5 w-1/2" />
              </div>
            ) : visible.length === 0 ? (
              <p className="p-1 text-xs text-muted-foreground">{t("noMatches")}</p>
            ) : (
              <ul className="grid gap-0.5">
                {visible.map((f) => (
                  <li key={f.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-muted/60">
                      <Checkbox checked={value.includes(f.id)} onCheckedChange={() => toggle(f.id)} />
                      <span>{localizedName(f, locale) || `#${f.id}`}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {can("inventory.edit") &&
            (adding ? (
              <div className="grid gap-2 rounded-md border border-dashed bg-muted/30 p-2 sm:grid-cols-[1fr_1fr_auto]">
                <Input
                  value={adding.nameAr}
                  onChange={(e) => setAdding({ ...adding, nameAr: e.target.value })}
                  onKeyDown={(e) => onKeyDown(e, submitNew)}
                  placeholder={t("nameAr")}
                  aria-label={t("nameAr")}
                  dir="rtl"
                  className="h-8 text-xs"
                  autoFocus
                />
                <Input
                  value={adding.nameEn}
                  onChange={(e) => setAdding({ ...adding, nameEn: e.target.value })}
                  onKeyDown={(e) => onKeyDown(e, submitNew)}
                  placeholder={t("nameEn")}
                  aria-label={t("nameEn")}
                  dir="ltr"
                  className="h-8 text-xs"
                />
                <div className="flex gap-1.5">
                  <Button type="button" size="sm" onClick={submitNew} disabled={!canSubmitNew || save.isPending}>
                    {save.isPending ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Plus data-icon="inline-start" />}
                    {t("add")}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(null)} aria-label={t("cancelAdd")}>
                    <X />
                  </Button>
                </div>
              </div>
            ) : (
              <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={startAdding}>
                <Plus data-icon="inline-start" />
                {search.trim() ? t("quickAddNamed", { name: search.trim() }) : t("quickAdd")}
              </Button>
            ))}
        </>
      )}
    </div>
  );
}
