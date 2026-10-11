import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type Tone = "neutral" | "primary" | "info" | "success" | "warning" | "danger";

const toneClass: Record<Tone, string> = {
  neutral: "border-border/80 bg-muted/60 text-muted-foreground",
  primary: "border-primary/25 bg-primary/10 text-primary",
  info: "border-info/25 bg-info/10 text-info",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/35 bg-warning/10 text-warning",
  danger: "border-destructive/30 bg-destructive/10 text-destructive",
};

export function StatusBadge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-tight whitespace-nowrap shadow-2xs transition-colors",
        toneClass[tone],
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current opacity-85" />
      {children}
    </span>
  );
}
