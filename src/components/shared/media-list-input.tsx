"use client";

import { ExternalLink, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fileName, mediaUrl } from "@/lib/format/media";
import { cn } from "@/lib/utils";
import { MediaPicture } from "./media-gallery";

/**
 * Image paths or URLs as thumbnails, with remove and add. Pasting several lines adds each one
 * (paths may contain spaces or commas, so only line breaks separate them). `max` = 1 makes it a single-image field. Lives inside forms: nothing submits them.
 */
export function MediaListInput({
  id,
  value,
  onChange,
  disabled,
  max,
  invalid,
}: {
  id: string;
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  max?: number;
  invalid?: boolean;
}) {
  const t = useTranslations("media");
  const [draft, setDraft] = useState("");
  const full = max !== undefined && value.length >= max;

  const add = (text = draft) => {
    const items = [...new Set(text.split(/\r?\n/).map((v) => v.trim()))].filter((v) => v && !value.includes(v));
    if (items.length > 0) {
      const next = [...value, ...items];
      onChange(max !== undefined ? next.slice(-max) : next);
    }
    setDraft("");
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      add();
    }
  };

  return (
    <div className={cn("grid gap-2 rounded-lg border p-2.5", invalid && "border-destructive")}>
      {value.length > 0 ? (
        <ul className={cn("grid gap-2", max === 1 ? "grid-cols-1 sm:max-w-xs" : "grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))]")}>
          {value.map((src, i) => {
            const href = mediaUrl(src);
            return (
              <li key={`${src}-${i}`} className="group relative overflow-hidden rounded-md border bg-card">
                <MediaPicture src={src} alt="" sizes="200px" className="aspect-4/3" />
                <div className="flex items-center gap-1 border-t px-1.5 py-1">
                  <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground" dir="ltr" title={src}>
                    {fileName(src)}
                  </span>
                  {href && (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="grid size-5 shrink-0 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={t("openOriginal", { name: fileName(src) })}
                    >
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => onChange(value.filter((_, j) => j !== i))}
                    className="absolute end-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-black/60 text-white opacity-90 hover:bg-black/80 focus-visible:opacity-100"
                    aria-label={t("remove", { name: fileName(src) })}
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">{t("none")}</p>
      )}
      {!disabled && !full && (
        <div className="flex gap-2">
          <Input
            id={id}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={(e) => {
              // Several lines pasted at once (a single-line input would glue them together): add them all.
              const text = e.clipboardData.getData("text");
              if (/\n/.test(text.trim())) {
                e.preventDefault();
                add(text);
              }
            }}
            placeholder={t("addPlaceholder")}
            dir="ltr"
            className="h-8 text-xs"
            aria-invalid={invalid || undefined}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => add()} disabled={!draft.trim()}>
            <Plus data-icon="inline-start" />
            {t("add")}
          </Button>
        </div>
      )}
    </div>
  );
}
