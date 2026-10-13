import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type Crumb = { label: string; href?: string };

export function PageHeader({
  title,
  description,
  breadcrumbs,
  breadcrumbsLabel,
  actions,
  meta,
  compact,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  breadcrumbs?: Crumb[];
  breadcrumbsLabel?: string;
  actions?: ReactNode;
  meta?: ReactNode;
  /** One short row: breadcrumbs lead into the title, the description becomes a hover hint. For table-first pages. */
  compact?: boolean;
  className?: string;
}) {
  if (compact) {
    const parents = breadcrumbs?.slice(0, -1) ?? [];
    return (
      // One line at every width: the actions never wrap, an open search gives way instead. It is also a size
      // container, so actions can drop their labels when the header (not the screen) is narrow, e.g. beside the sidebar.
      <header className={cn("@container relative flex min-h-7 items-center justify-between gap-x-3", className)}>
        <div className="flex max-w-1/2 shrink-0 items-center gap-1 text-[11px] text-muted-foreground/80">
          {parents.length > 0 && (
            <nav aria-label={breadcrumbsLabel} className="contents max-sm:hidden">
              {parents.map((crumb, i) => (
                <span key={`${crumb.label}-${i}`} className="flex items-center gap-1">
                  {crumb.href ? (
                    <Link href={crumb.href} className="transition-colors hover:text-foreground focus-visible:underline">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span>{crumb.label}</span>
                  )}
                  <ChevronRight aria-hidden className="size-2.5 text-muted-foreground/50 rtl:rotate-180" />
                </span>
              ))}
            </nav>
          )}
          <h1
            className="truncate text-sm font-bold tracking-tight text-foreground"
            title={typeof description === "string" ? description : undefined}
          >
            {title}
          </h1>
          {description && <p className="sr-only">{description}</p>}
        </div>
        {actions && <div className="flex min-w-0 items-center justify-end gap-1.5">{actions}</div>}
      </header>
    );
  }

  return (
    <header className={cn("flex flex-col gap-1 pb-0.5", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label={breadcrumbsLabel} className="min-w-0">
          <ol className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground/80">
            {breadcrumbs.map((crumb, i) => (
              <li key={`${crumb.label}-${i}`} className="flex items-center gap-1">
                {i > 0 && <ChevronRight aria-hidden className="size-2.5 text-muted-foreground/50 rtl:rotate-180" />}
                {crumb.href ? (
                  <Link href={crumb.href} className="transition-colors hover:text-foreground focus-visible:underline">
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="font-medium text-foreground/90">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
        <div className="min-w-0 space-y-0.5">
          <h1 className="text-base font-bold tracking-tight text-foreground sm:text-lg">{title}</h1>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
          {meta && <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-muted-foreground">{meta}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </header>
  );
}
