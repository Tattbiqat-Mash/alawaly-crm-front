import type { StatusCounts } from "../../site-plan";
import { PLAN_STATUS_ORDER, swatchTone } from "./unit-tone";
import { cn } from "@/lib/utils";

/** Stacked share of each status; decorative (the counts are spelled out next to it). */
export function StatusBar({ counts, className }: { counts: StatusCounts; className?: string }) {
  const total = PLAN_STATUS_ORDER.reduce((sum, s) => sum + counts[s], 0);
  return (
    <span aria-hidden className={cn("flex h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      {total > 0 &&
        PLAN_STATUS_ORDER.filter((s) => counts[s] > 0).map((s) => (
          <span key={s} className={cn("h-full transition-[width] duration-500", swatchTone[s])} style={{ width: `${(counts[s] / total) * 100}%` }} />
        ))}
    </span>
  );
}
