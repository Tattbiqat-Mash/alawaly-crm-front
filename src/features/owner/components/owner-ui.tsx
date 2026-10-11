"use client";

import { ChevronLeft, Inbox, type LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { ErrorState, StatePanel } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

// Small building blocks shared by the owner screens: touch-first cards and rows (44px+ targets).

export function OwnerCard({ className, children, ...props }: ComponentProps<"section">) {
  return (
    <section className={cn("rounded-2xl border bg-card p-4 shadow-2xs", className)} {...props}>
      {children}
    </section>
  );
}

export function OwnerCardTitle({ icon: Icon, children, action }: { icon?: LucideIcon; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {Icon && (
          <span aria-hidden className="grid size-6 place-items-center rounded-md bg-muted">
            <Icon className="size-3.5" />
          </span>
        )}
        {children}
      </h2>
      {action}
    </div>
  );
}

/** A list of rows inside one card. */
export function OwnerList({ children, className }: { children: ReactNode; className?: string }) {
  return <ul className={cn("divide-y divide-border/60 overflow-hidden rounded-2xl border bg-card shadow-2xs", className)}>{children}</ul>;
}

/** One tappable (or static) row: title, subtitle, trailing badge. */
export function OwnerRow({ href, title, subtitle, trailing, onClick }: { href?: string; title: ReactNode; subtitle?: ReactNode; trailing?: ReactNode; onClick?: () => void }) {
  const body = (
    <>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{title}</p>
        {subtitle && <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>}
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
      {href && <ChevronLeft aria-hidden className="size-4 shrink-0 text-muted-foreground ltr:rotate-180" />}
    </>
  );
  const cls = "flex min-h-14 w-full items-center gap-3 px-4 py-3 text-start";
  return (
    <li>
      {href ? (
        <Link href={href} onClick={onClick} className={cn(cls, "transition-colors hover:bg-muted/50 focus-visible:bg-muted/60 focus-visible:outline-none")}>
          {body}
        </Link>
      ) : (
        <div className={cls}>{body}</div>
      )}
    </li>
  );
}

export function OwnerListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="grid gap-2 rounded-2xl border bg-card p-4 shadow-2xs" aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-11 w-full" />
      ))}
    </div>
  );
}

export function OwnerError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <OwnerCard>
      <ErrorState compact error={error} onRetry={onRetry} />
    </OwnerCard>
  );
}

export function OwnerEmpty({ title, description, icon = Inbox, action }: { title: string; description?: ReactNode; icon?: LucideIcon; action?: ReactNode }) {
  return (
    <OwnerCard className="p-0">
      <StatePanel compact icon={icon} title={title} description={description} action={action} />
    </OwnerCard>
  );
}

/** Label/value pairs in a two-column grid. */
export function OwnerFacts({ items }: { items: [label: ReactNode, value: ReactNode][] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
      {items.map(([label, value], i) => (
        <div key={i} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="mt-0.5 font-medium text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
