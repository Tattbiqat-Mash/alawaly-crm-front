import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ar", "en"],
  defaultLocale: "ar",
  // Arabic (default) keeps the wireframe URLs (/units); English is prefixed (/en/units).
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];

export const localeDirection = (locale: Locale) => (locale === "ar" ? "rtl" : "ltr");
