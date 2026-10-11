"use client";

import { useMutation } from "@tanstack/react-query";
import { BellOff, Languages, LogOut, Palette } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { LocaleSwitch } from "@/components/layout/locale-switch";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
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

// O17 — More and sign out (rentals and contact rows arrive with O16 in Phase D).
export function OwnerMore() {
  const t = useTranslations("owner.more");
  const locale = useLocale();
  // Leaving with a full navigation drops all cached owner data, even if the call failed.
  const signOut = useMutation({
    mutationFn: ownerAuthApi.logout,
    onSettled: () => window.location.assign(locale === "ar" ? "/owner/sign-in" : `/${locale}/owner/sign-in`),
  });

  return (
    <div className="grid gap-4">
      <ul className="divide-y rounded-2xl border bg-card">
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
      <Button variant="destructive" className="h-12 text-base" disabled={signOut.isPending} onClick={() => signOut.mutate()}>
        <LogOut data-icon="inline-start" className="rtl:rotate-180" />
        {t("signOut")}
      </Button>
    </div>
  );
}
