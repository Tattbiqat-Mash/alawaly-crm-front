"use client";

import { Bell, ChevronLeft, Home, LayoutGrid, Menu, Wrench, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Suspense, type ReactNode } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { LocaleSwitch } from "./locale-switch";
import { ThemeToggle } from "./theme-toggle";

type Tab = { key: "home" | "units" | "requests" | "alerts" | "more"; href: string; icon: LucideIcon; ready: boolean };

// Bottom tabs from the owner wireframes. A tab whose screen is not built stays visible but inert
// and says so, rather than linking to nothing.
const TABS: Tab[] = [
  { key: "home", href: "/owner", icon: Home, ready: true },
  { key: "units", href: "/owner/units", icon: LayoutGrid, ready: true },
  { key: "requests", href: "/owner/requests", icon: Wrench, ready: true },
  { key: "alerts", href: "/owner/notifications", icon: Bell, ready: true },
  { key: "more", href: "/owner/more", icon: Menu, ready: true },
];

export function OwnerTabBar() {
  // The active tab comes from the URL; until it streams in, tabs render without a highlight.
  return (
    <Suspense fallback={<TabBar pathname={null} />}>
      <TabBarWithPath />
    </Suspense>
  );
}

function TabBarWithPath() {
  return <TabBar pathname={usePathname()} />;
}

function TabBar({ pathname }: { pathname: string | null }) {
  const t = useTranslations();
  return (
    <nav
      aria-label={t("owner.tabs.label")}
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/90 pb-[env(safe-area-inset-bottom)] shadow-xs backdrop-blur-md supports-[backdrop-filter]:bg-card/85"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5 md:max-w-xl">
        {TABS.map((tab) => {
          const active = pathname !== null && (tab.href === "/owner" ? pathname === "/owner" : pathname.startsWith(tab.href));
          const content = (
            <>
              <tab.icon aria-hidden className={cn("size-5 transition-transform", active && "scale-105 text-primary")} />
              <span className={cn("text-[11px] leading-none transition-colors", active ? "font-semibold text-primary" : "text-muted-foreground")}>
                {t(`owner.tabs.${tab.key}`)}
              </span>
            </>
          );
          const cls = "flex h-14 md:h-16 flex-col items-center justify-center gap-1.5 transition-colors";
          return (
            <li key={tab.key}>
              {tab.ready ? (
                <Link
                  href={tab.href}
                  prefetch
                  aria-current={active ? "page" : undefined}
                  className={cn(cls, "focus-visible:bg-accent focus-visible:outline-none", active ? "text-primary" : "text-muted-foreground hover:text-foreground")}
                >
                  {content}
                </Link>
              ) : (
                <span aria-disabled="true" className={cn(cls, "text-muted-foreground/40")} title={t("owner.home.comingNext")}>
                  {content}
                  <span className="sr-only">({t("common.comingSoon")})</span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Phone/Web header: optional back link, title and the language switch. */
export function OwnerHeader({ title, backHref }: { title: ReactNode; backHref?: string }) {
  const t = useTranslations("common");
  return (
    <header className="sticky top-0 z-20 flex h-11 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur-md md:h-12 md:px-5">
      {backHref ? (
        <Link href={backHref} aria-label={t("back")} className="grid size-8 place-items-center rounded-lg transition-colors hover:bg-muted md:size-9">
          <ChevronLeft className="size-4 rtl:rotate-180 md:size-5" />
        </Link>
      ) : (
        <span className="w-1" />
      )}
      <h1 className="min-w-0 flex-1 truncate text-sm font-bold tracking-tight text-foreground sm:text-base">{title}</h1>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <LocaleSwitch />
      </div>
    </header>
  );
}

/** Web-first layout expanding to max-w-5xl on desktop, with mobile-friendly centering and safe area. */
export function OwnerShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background transition-all md:max-w-5xl">
      <div className="flex-1 px-3.5 pt-2.5 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-4">{children}</div>
      <OwnerTabBar />
    </div>
  );
}
