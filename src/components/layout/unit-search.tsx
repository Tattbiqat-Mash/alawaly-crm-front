"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { usePermissions } from "@/features/auth/hooks";

/**
 * Top-bar search. The API has no global search endpoint yet, so this searches units
 * (number, code or CRM id) via GET /units?q=.
 */
export function UnitSearch() {
  const t = useTranslations("nav");
  const router = useRouter();
  const { can } = usePermissions();
  if (!can("inventory.view")) return null;

  return (
    <form
      role="search"
      className="relative w-full max-w-xs md:max-w-sm"
      onSubmit={(e) => {
        e.preventDefault();
        const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
        router.push(q ? `/units?q=${encodeURIComponent(q)}` : "/units");
      }}
    >
      <Search aria-hidden className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground transition-colors peer-focus:text-primary" />
      <Input
        name="q"
        type="search"
        aria-label={t("searchUnits")}
        placeholder={t("searchUnits")}
        className="peer h-8 bg-muted/40 ps-8 pe-10 text-xs transition-all focus:bg-background md:text-xs"
      />
      <kbd
        aria-hidden
        className="pointer-events-none absolute end-2.5 top-1/2 hidden -translate-y-1/2 rounded border bg-muted/80 px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-block"
      >
        /
      </kbd>
    </form>
  );
}
