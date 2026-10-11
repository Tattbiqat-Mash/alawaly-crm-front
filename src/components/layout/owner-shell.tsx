"use client";

import { Bell, ChevronLeft, Home, LayoutGrid, Menu, Wrench, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Suspense, type ReactNode } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { LocaleSwitch } from "./locale-switch";

type Tab = { key: "home" | "units" | "requests" | "alerts" | "more"; href: string; icon: LucideIcon; ready: boolean };

// Bottom tabs from the owner wireframes. Tabs whose screens arrive in Phase D stay visible but
// inert and say so, rather than linking to nothing.
const TABS: Tab[] = [
  { key: "home", href: "/owner", icon: Home, ready: true },
  { key: "units", href: "/owner/units", icon: LayoutGrid, ready: false },
  { key: "requests", href: "/owner/requests", icon: Wrench, ready: false },
  { key: "alerts", href: "/owner/notifications", icon: Bell, ready: false },
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
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-card/80"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {TABS.map((tab) => {
          const active = pathname !== null && (tab.href === "/owner" ? pathname === "/owner" : pathname.startsWith(tab.href));
          const content = (
            <>
              <tab.icon aria-hidden className="size-5" />
              <span className="text-[11px] leading-none">{t(`owner.tabs.${tab.key}`)}</span>
            </>
          );
          const cls = "flex h-16 flex-col items-center justify-center gap-1";
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
                <span aria-disabled="true" className={cn(cls, "text-muted-foreground/50")} title={t("owner.home.comingNext")}>
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

/** Phone header: optional back link, title and the language switch. */
export function OwnerHeader({ title, backHref }: { title: ReactNode; backHref?: string }) {
  const t = useTranslations("common");
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/95 px-2 backdrop-blur">
      {backHref ? (
        <Link href={backHref} aria-label={t("back")} className="grid size-10 place-items-center rounded-lg hover:bg-muted">
          <ChevronLeft className="size-5 rtl:rotate-180" />
        </Link>
      ) : (
        <span className="w-2" />
      )}
      <h1 className="min-w-0 flex-1 truncate text-base font-semibold">{title}</h1>
      <LocaleSwitch />
    </header>
  );
}

/** Mobile-first column (360px and up), centred on larger screens, with room for the tab bar. */
export function OwnerShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <div className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom)+1rem)]">{children}</div>
      <OwnerTabBar />
    </div>
  );
}
