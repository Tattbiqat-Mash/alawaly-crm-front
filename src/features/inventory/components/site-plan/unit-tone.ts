import type { UnitStatus } from "@/config/statuses";

export type PlanStatus = UnitStatus | "unknown";

// Units drawn as windows. What can still be sold is the brightest glass (lit at night in dark mode),
// reserved glows softer, sold settles into the facade; dashed for not-yet-built.
// Same hues as the status badges so the plan and the table read alike.
export const windowTone: Record<PlanStatus, string> = {
  available:
    "border-success/70 bg-linear-to-b from-success/40 to-success/20 text-success shadow-[0_0_0_1px_color-mix(in_oklch,var(--success)_15%,transparent)] hover:from-success/55 hover:to-success/30 dark:from-success/55 dark:to-success/30 dark:text-white dark:shadow-[0_0_14px_-2px_var(--success)]",
  reserved:
    "border-warning/60 bg-linear-to-b from-warning/30 to-warning/15 text-warning hover:from-warning/45 hover:to-warning/25 dark:from-warning/40 dark:to-warning/20 dark:shadow-[0_0_10px_-4px_var(--warning)]",
  sold: "border-primary/25 bg-primary/12 text-primary/70 hover:bg-primary/20 dark:bg-primary/10 dark:text-primary/60",
  completed: "border-info/50 bg-info/20 text-info hover:bg-info/30",
  planned: "border-dashed border-muted-foreground/45 bg-background/50 text-muted-foreground hover:bg-background",
  unavailable: "border-muted-foreground/35 bg-muted-foreground/20 text-muted-foreground hover:bg-muted-foreground/30",
  hidden: "border-destructive/45 bg-destructive/15 text-destructive hover:bg-destructive/25",
  unknown: "border-border bg-background text-muted-foreground hover:bg-muted",
};

/** Units the filters leave out: one neutral ghost, so it never reads as a status of its own. */
export const ghostTone = "border-foreground/8 bg-foreground/4 text-foreground/25 hover:bg-foreground/8 hover:text-foreground/50";

/** Solid swatch for legends and availability bars. */
export const swatchTone: Record<PlanStatus, string> = {
  available: "bg-success",
  reserved: "bg-warning",
  sold: "bg-primary/45",
  completed: "bg-info",
  planned: "bg-muted-foreground/40",
  unavailable: "bg-muted-foreground/70",
  hidden: "bg-destructive",
  unknown: "bg-border",
};

/** Legend and bar order: what sales looks at first. */
export const PLAN_STATUS_ORDER: readonly PlanStatus[] = [
  "available",
  "reserved",
  "sold",
  "completed",
  "planned",
  "unavailable",
  "hidden",
  "unknown",
];
