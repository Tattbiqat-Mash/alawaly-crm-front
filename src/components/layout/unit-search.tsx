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
      className="relative w-full max-w-sm"
      onSubmit={(e) => {
        e.preventDefault();
        const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
        router.push(q ? `/units?q=${encodeURIComponent(q)}` : "/units");
      }}
    >
      <Search aria-hidden className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input name="q" type="search" aria-label={t("searchUnits")} placeholder={t("searchUnits")} className="h-9 ps-8" />
    </form>
  );
}
