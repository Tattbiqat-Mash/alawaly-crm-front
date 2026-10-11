"use client";

import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { visibleNav } from "@/config/nav";
import { usePermissions } from "@/features/auth/hooks";
import { Link, usePathname } from "@/i18n/navigation";
import { useEndSide } from "@/hooks/use-end-side";
import { cn } from "@/lib/utils";

const matches = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

type Props = { collapsed?: boolean; onNavigate?: () => void };

function NavSkeleton() {
  return (
    <div className="space-y-2 p-3" aria-hidden>
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  );
}

/** Sidebar navigation built from the user's permissions (groups without items are hidden). */
export function AdminNav(props: Props) {
  return (
    <Suspense fallback={<NavSkeleton />}>
      <AdminNavLinks {...props} />
    </Suspense>
  );
}

function AdminNavLinks({ collapsed, onNavigate }: Props) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { can, ready } = usePermissions();
  const tooltipSide = useEndSide();

  if (!ready) return <NavSkeleton />;

  const groups = visibleNav(can);
  // Only the most specific match is active (/units/import highlights "Import", not "Units").
  const activeHref = groups
    .flatMap((g) => g.items.map((i) => i.href))
    .filter((href) => matches(pathname, href))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <nav aria-label={t("label")} className="flex flex-col gap-4 p-3">
      {groups.map((group) => (
        <div key={group.key} className="flex flex-col gap-0.5">
          {!collapsed && (
            <p className="px-2.5 pb-1 text-[10px] font-bold tracking-wider text-muted-foreground/80 uppercase">
              {t(`groups.${group.key}`)}
            </p>
          )}
          {group.items.map((item) => {
            const active = item.href === activeHref;
            const label = t(`items.${item.key}`);
            const link = (
              <Link
                href={item.href}
                prefetch
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-all",
                  "focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none",
                  active
                    ? "bg-primary/10 font-semibold text-primary shadow-xs ring-1 ring-primary/20"
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                  collapsed && "justify-center px-0",
                )}
              >
                <item.icon
                  aria-hidden
                  className={cn(
                    "size-4 shrink-0 transition-transform group-hover:scale-105",
                    active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                  )}
                />
                {collapsed ? <span className="sr-only">{label}</span> : <span className="truncate">{label}</span>}
              </Link>
            );
            return collapsed ? (
              <Tooltip key={item.key}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side={tooltipSide}>{label}</TooltipContent>
              </Tooltip>
            ) : (
              <div key={item.key}>{link}</div>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
