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

const isActive = (pathname: string, href: string) =>
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

  return (
    <nav aria-label={t("label")} className="flex flex-col gap-4 p-3">
      {visibleNav(can).map((group) => (
        <div key={group.key} className="flex flex-col gap-0.5">
          {!collapsed && (
            <p className="px-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t(`groups.${group.key}`)}
            </p>
          )}
          {group.items.map((item) => {
            const active = isActive(pathname, item.href);
            const label = t(`items.${item.key}`);
            const link = (
              <Link
                href={item.href}
                prefetch
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-muted hover:text-sidebar-foreground",
                  collapsed && "justify-center px-0",
                )}
              >
                <item.icon aria-hidden className="size-4 shrink-0" />
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
