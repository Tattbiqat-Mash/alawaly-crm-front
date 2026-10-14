"use client";

import { ChevronLeft, ChevronRight, ImageOff, Images } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { mediaUrl } from "@/lib/format/media";
import { cn } from "@/lib/utils";

/** One image that falls back to a quiet placeholder when the file is missing. */
export function MediaPicture({ src, alt, className, sizes, contain }: { src: string; alt: string; className?: string; sizes: string; contain?: boolean }) {
  const [failed, setFailed] = useState(false);
  const url = mediaUrl(src);
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {failed || !url ? (
        <div className="absolute inset-0 grid place-items-center text-muted-foreground/60">
          <ImageOff aria-hidden className="size-6" />
        </div>
      ) : (
        // Backend files (or any URL): no Next image optimisation in front of them.
        <Image src={url} alt={alt} fill unoptimized sizes={sizes} className={contain ? "object-contain" : "object-cover"} onError={() => setFailed(true)} />
      )}
    </div>
  );
}

/**
 * Cover image large, the rest as thumbnails; any of them opens a viewer with previous/next
 * (arrow keys too). Stored paths and full URLs both work.
 */
export function MediaGallery({ images, title }: { images: string[]; title: string }) {
  const t = useTranslations("media");
  const [open, setOpen] = useState<number | null>(null);
  const list = images.filter(Boolean);

  if (list.length === 0) {
    return (
      <div className="grid h-40 place-items-center rounded-lg border border-dashed text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          <Images aria-hidden className="size-4" />
          {t("none")}
        </span>
      </div>
    );
  }

  const [cover, ...rest] = list;
  const shown = rest.slice(0, 4);
  const hidden = rest.length - shown.length;
  const go = (delta: number) => setOpen((i) => (i === null ? i : (i + delta + list.length) % list.length));
  // In RTL the "next" arrow points left.
  const onKeyDown = (e: KeyboardEvent) => {
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    if (e.key === "ArrowRight") go(rtl ? -1 : 1);
    if (e.key === "ArrowLeft") go(rtl ? 1 : -1);
  };
  const thumb = (src: string, index: number, extra?: number) => (
    <button
      key={`${src}-${index}`}
      type="button"
      onClick={() => setOpen(index)}
      className="group relative overflow-hidden rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:h-full"
      aria-label={t("open", { n: index + 1, total: list.length })}
    >
      <MediaPicture src={src} alt="" sizes="(min-width: 1024px) 20vw, 45vw" className="aspect-4/3 transition-transform duration-300 group-hover:scale-105 lg:aspect-auto lg:h-full" />
      {extra ? (
        <span className="num absolute inset-0 grid place-items-center bg-black/55 text-lg font-semibold text-white">+{extra}</span>
      ) : null}
    </button>
  );

  return (
    <>
      <div className={cn("grid gap-2", rest.length > 0 && "lg:grid-cols-[3fr_2fr]")}>
        <button
          type="button"
          onClick={() => setOpen(0)}
          className="group relative overflow-hidden rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label={t("open", { n: 1, total: list.length })}
        >
          <MediaPicture
            src={cover}
            alt={title}
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="aspect-video h-full transition-transform duration-300 group-hover:scale-[1.02]"
          />
          <span className="absolute start-2.5 bottom-2.5 rounded-full bg-black/55 px-2.5 py-0.5 text-xs font-medium text-white">{t("cover")}</span>
        </button>
        {shown.length > 0 && (
          // The thumbnails fill the cover's height: one alone, two stacked, three or four as a 2×2.
          <div className={cn("grid gap-2", shown.length > 1 && "grid-cols-2", shown.length === 2 && "lg:grid-cols-1 lg:grid-rows-2", shown.length > 2 && "lg:grid-rows-2")}>
            {shown.map((src, i) => thumb(src, i + 1, i === shown.length - 1 && hidden > 0 ? hidden : undefined))}
          </div>
        )}
      </div>

      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] gap-3 p-3 sm:max-w-4xl" onKeyDown={onKeyDown}>
          <DialogTitle className="pe-8 text-sm">{title}</DialogTitle>
          <DialogDescription className="num text-xs">{open !== null && t("position", { n: open + 1, total: list.length })}</DialogDescription>
          {open !== null && (
            <div className="relative">
              <MediaPicture key={list[open]} src={list[open]} alt={title} sizes="90vw" contain className="aspect-video rounded-lg bg-black/90" />
              {list.length > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute start-2 top-1/2 -translate-y-1/2 rounded-full opacity-90"
                    onClick={() => go(-1)}
                    aria-label={t("previous")}
                  >
                    <ChevronLeft className="rtl:rotate-180" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute end-2 top-1/2 -translate-y-1/2 rounded-full opacity-90"
                    onClick={() => go(1)}
                    aria-label={t("next")}
                  >
                    <ChevronRight className="rtl:rotate-180" />
                  </Button>
                </>
              )}
            </div>
          )}
          {list.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {list.map((src, i) => (
                <button
                  key={`${src}-${i}`}
                  type="button"
                  onClick={() => setOpen(i)}
                  aria-label={t("open", { n: i + 1, total: list.length })}
                  aria-current={i === open}
                  className={cn("shrink-0 overflow-hidden rounded-md ring-2 ring-transparent outline-none", i === open ? "ring-primary" : "opacity-60 hover:opacity-100")}
                >
                  <MediaPicture src={src} alt="" sizes="80px" className="h-12 w-16" />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
