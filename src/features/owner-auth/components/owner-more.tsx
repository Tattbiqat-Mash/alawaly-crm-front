"use client";

import { useMutation } from "@tanstack/react-query";
import { BellOff, Building, CalendarClock, ChevronLeft, Languages, LogOut, Palette, ShieldCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { LocaleSwitch } from "@/components/layout/locale-switch";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { ownerAuthApi } from "../api";

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <li className="flex min-h-14 items-center gap-3 px-4 py-2">
      <span aria-hidden className="text-muted-foreground">
        {icon}
      </span>
      <span className="flex-1 text-sm">{label}</span>
      {children}
    </li>
  );
}

/** Screens reached from More rather than a bottom tab. */
const LINKS = [
  { href: "/owner/reservations", key: "reservations", icon: CalendarClock },
  { href: "/owner/warranties", key: "warranties", icon: ShieldCheck },
  { href: "/owner/rentals", key: "rentals", icon: Building },
] as const;

// O17 — More and sign out.
export function OwnerMore() {
  const t = useTranslations("owner.more");
  const tl = useTranslations("ownerPortal.more");
  const locale = useLocale();
  // Leaving with a full navigation drops all cached owner data, even if the call failed.
  const signOut = useMutation({
    mutationFn: ownerAuthApi.logout,
    onSettled: () => window.location.assign(locale === "ar" ? "/owner/sign-in" : `/${locale}/owner/sign-in`),
  });

  return (
    <div className="grid gap-4">
      <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border bg-card shadow-2xs">
        {LINKS.map((l) => (
          <li key={l.key}>
            <Link href={l.href} className="flex min-h-14 items-center gap-3 px-4 py-2 transition-colors hover:bg-muted/50">
              <l.icon aria-hidden className="size-5 text-muted-foreground" />
              <span className="flex-1 text-sm">{tl(l.key)}</span>
              <ChevronLeft aria-hidden className="size-4 text-muted-foreground ltr:rotate-180" />
            </Link>
          </li>
        ))}
      </ul>
      <ul className="divide-y divide-border/60 rounded-2xl border bg-card shadow-2xs">
        <Row icon={<Languages className="size-5" />} label={t("language")}>
          <LocaleSwitch variant="outline" />
        </Row>
        <Row icon={<Palette className="size-5" />} label={t("theme")}>
          <ThemeToggle />
        </Row>
        <Row icon={<BellOff className="size-5" />} label={t("notificationPrefs")}>
          <span className="text-xs text-muted-foreground">{t("notificationPrefsSoon")}</span>
        </Row>
      </ul>
      <Button
        variant="destructive"
        className="h-12 text-sm font-semibold shadow-2xs transition-all hover:bg-destructive/90"
        disabled={signOut.isPending}
        onClick={() => signOut.mutate()}
      >
        <LogOut className="size-4 rtl:rotate-180" />
        {t("signOut")}
      </Button>
    </div>
  );
}
