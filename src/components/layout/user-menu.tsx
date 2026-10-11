"use client";

import { LogOut } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useLogout, useMe } from "@/features/auth/hooks";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

export function UserMenu() {
  const t = useTranslations();
  const locale = useLocale();
  const { data: me } = useMe();
  // A full navigation also drops every cached query.
  const logout = useLogout(() => window.location.assign(locale === "ar" ? "/login" : `/${locale}/login`));

  if (!me) return <Skeleton className="size-8 rounded-full" />;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 gap-2 rounded-lg px-2 hover:bg-muted/80" aria-label={t("nav.userMenu")}>
          <div className="relative">
            <Avatar className="size-7 ring-1 ring-border">
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials(me.name)}</AvatarFallback>
            </Avatar>
            <span
              aria-hidden
              className="absolute -bottom-0.5 -end-0.5 size-2 rounded-full bg-emerald-500 ring-2 ring-background"
            />
          </div>
          <span className="hidden max-w-32 truncate text-xs font-medium text-foreground/90 lg:inline">{me.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-1.5">
        <DropdownMenuLabel className="p-2 font-normal">
          <div className="flex items-center gap-2.5">
            <Avatar className="size-8 ring-1 ring-border">
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials(me.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{me.name}</p>
              <p className="truncate text-xs text-muted-foreground" dir="ltr">
                {me.email}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={logout.isPending}
          onSelect={() => logout.mutate()}
          className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <LogOut className="size-4 rtl:rotate-180" />
          {t("common.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
