"use client";

import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCount } from "@/lib/format/money";

export type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

const PAGE_SIZES = [10, 25, 50, 100];

export function TablePagination({ page, pageSize, total, onPageChange, onPageSizeChange }: PaginationProps) {
  const t = useTranslations("table");
  const locale = useLocale();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pages);

  return (
    <nav
      aria-label={t("pageOf", { page: current, pages })}
      className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t px-3 py-2 text-sm"
    >
      <p className="text-muted-foreground" aria-live="polite">
        {t("total", { total })}
      </p>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span id="rows-per-page" className="hidden text-muted-foreground sm:inline">
            {t("rowsPerPage")}
          </span>
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger size="sm" aria-labelledby="rows-per-page" className="w-18">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {formatCount(size, locale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="num text-muted-foreground">{t("pageOf", { page: current, pages })}</span>
        <div className="flex items-center gap-1">
          {/* Chevrons mirror in Arabic so "next" always points along the reading direction. */}
          <Button variant="ghost" size="icon-sm" aria-label={t("first")} disabled={current <= 1} onClick={() => onPageChange(1)}>
            <ChevronFirst className="rtl:rotate-180" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("previous")}
            disabled={current <= 1}
            onClick={() => onPageChange(current - 1)}
          >
            <ChevronLeft className="rtl:rotate-180" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("next")}
            disabled={current >= pages}
            onClick={() => onPageChange(current + 1)}
          >
            <ChevronRight className="rtl:rotate-180" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("last")}
            disabled={current >= pages}
            onClick={() => onPageChange(pages)}
          >
            <ChevronLast className="rtl:rotate-180" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
