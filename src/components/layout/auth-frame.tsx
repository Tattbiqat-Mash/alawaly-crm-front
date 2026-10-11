import type { ReactNode } from "react";
import { Brand } from "./brand";
import { LocaleSwitch } from "./locale-switch";
import { ThemeToggle } from "./theme-toggle";

/** Centered frame for the sign-in screens (staff and owner). */
export function AuthFrame({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(10,95,86,0.08),transparent)]">
      <header className="flex items-center justify-between px-4 py-3.5 sm:px-6">
        <Brand />
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <LocaleSwitch />
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-[6vh] pb-10 sm:items-center sm:pt-0">
        <div className="w-full max-w-sm">
          <div className="rounded-2xl border bg-card/95 p-6.5 shadow-sm ring-1 ring-border/60 backdrop-blur-xs sm:p-8">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h1>
            {subtitle && <p className="mt-1.5 text-xs text-muted-foreground md:text-sm">{subtitle}</p>}
            <div className="mt-6">{children}</div>
          </div>
          {footer && <div className="mt-4.5 text-center text-xs text-muted-foreground md:text-sm">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
