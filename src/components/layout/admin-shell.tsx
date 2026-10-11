"use client";

import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useStartSide } from "@/hooks/use-end-side";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { AdminNav } from "./admin-nav";
import { Brand } from "./brand";
import { LocaleSwitch } from "./locale-switch";
import { ThemeToggle } from "./theme-toggle";
import { UnitSearch } from "./unit-search";
import { UserMenu } from "./user-menu";

/** S42 — staff app shell: permission-driven sidebar, top bar, and a content area that pages fill. */
export function AdminShell({ children }: { children: ReactNode }) {
  const t = useTranslations("common");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const startSide = useStartSide();

  return (
    <div className="flex h-dvh overflow-hidden">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:start-3 focus:top-3"
      >
        {t("skipToContent")}
      </a>

      <aside
        className={cn(
          "hidden shrink-0 flex-col border-e bg-sidebar transition-[width] duration-200 md:flex",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <div className={cn("flex h-14 shrink-0 items-center border-b", collapsed ? "justify-center" : "px-4")}>
          <Link href="/" aria-label="Alawaly">
            <Brand compact={collapsed} />
          </Link>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <AdminNav collapsed={collapsed} />
        </div>
        <div className="shrink-0 border-t p-2">
          <Button
            variant="ghost"
            size="icon"
            className="w-full"
            aria-label={collapsed ? t("expandMenu") : t("collapseMenu")}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? <PanelLeftOpen className="rtl:rotate-180" /> : <PanelLeftClose className="rtl:rotate-180" />}
          </Button>
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side={startSide} className="w-72 gap-0 p-0">
          <SheetTitle className="flex h-14 items-center border-b px-4">
            <Brand />
          </SheetTitle>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <AdminNav onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-card/90 px-3 backdrop-blur-md md:px-5">
          <Button variant="ghost" size="icon" className="md:hidden" aria-label={t("menu")} onClick={() => setMobileOpen(true)}>
            <Menu />
          </Button>
          <div className="min-w-0 flex-1">
            <UnitSearch />
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <LocaleSwitch />
            <div className="ms-1 h-5 w-px bg-border/80" />
            <UserMenu />
          </div>
        </header>
        <main id="main" tabIndex={-1} className="flex min-h-0 flex-1 flex-col overflow-y-auto outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}

/** Standard page padding; `fill` lets a table take the remaining height. */
export function PageContainer({ children, fill, className }: { children: ReactNode; fill?: boolean; className?: string }) {
  return (
    <div className={cn("mx-auto flex w-full max-w-[1600px] flex-col gap-4 p-4 md:p-6", fill && "min-h-0 flex-1", className)}>
      {children}
    </div>
  );
}
