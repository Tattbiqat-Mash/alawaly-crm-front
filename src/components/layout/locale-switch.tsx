"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Suspense, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

type Props = { variant?: "ghost" | "outline" };

/**
 * AR | EN: mirrors the whole layout immediately; next-intl remembers the choice in a cookie.
 * It reads the current URL, so it streams in behind Suspense; the fallback is the same button, inert.
 */
export function LocaleSwitch(props: Props) {
  return (
    <Suspense fallback={<LocaleSwitchFallback {...props} />}>
      <LocaleSwitchButton {...props} />
    </Suspense>
  );
}

function LocaleSwitchFallback({ variant = "ghost" }: Props) {
  const t = useTranslations("common");
  return (
    <Button variant={variant} size="sm" disabled>
      <Languages data-icon="inline-start" />
      {t("switchLanguage")}
    </Button>
  );
}

function LocaleSwitchButton({ variant = "ghost" }: Props) {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const other: Locale = locale === "ar" ? "en" : "ar";

  return (
    <Button
      variant={variant}
      size="sm"
      disabled={pending}
      lang={other}
      aria-label={`${t("language")}: ${t("switchLanguage")}`}
      onClick={() =>
        startTransition(() => router.replace(`${pathname}${window.location.search}`, { locale: other }))
      }
    >
      <Languages data-icon="inline-start" />
      {t("switchLanguage")}
    </Button>
  );
}
