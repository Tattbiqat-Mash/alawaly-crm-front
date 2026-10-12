import type { UnitStatus } from "@/config/statuses";

export type PlanStatus = UnitStatus | "unknown";

// Units drawn as windows: tinted glass for open stock, solid for sold, dashed for not-yet-built.
// Same hues as the status badges so the plan and the table read alike.
export const windowTone: Record<PlanStatus, string> = {
  available: "border-success/50 bg-success/20 text-success hover:bg-success/30",
  reserved: "border-warning/55 bg-warning/20 text-warning hover:bg-warning/30",
  sold: "border-primary bg-primary text-primary-foreground hover:bg-primary/85",
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
  sold: "bg-primary",
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
