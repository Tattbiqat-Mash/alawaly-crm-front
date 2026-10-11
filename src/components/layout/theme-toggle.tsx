"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

/** One button: light ⇄ dark. The default (no saved choice) follows the system setting. */
export function ThemeToggle() {
  const t = useTranslations("common");
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Button variant="ghost" size="icon" aria-label={t("theme")} title={t("theme")} onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
      {/* Icons switch with the CSS class, so the first render matches the server. */}
      <Moon className="dark:hidden" />
      <Sun className="hidden dark:block" />
    </Button>
  );
}
