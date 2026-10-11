import { cn } from "@/lib/utils";

/** Wordmark. Kept in Latin letters in both languages until the brand supplies an Arabic mark. */
export function Brand({ compact, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold", className)} dir="ltr">
      <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
        A
      </span>
      {!compact && <span className="text-sm tracking-[0.18em]">ALAWALY</span>}
      {compact && <span className="sr-only">Alawaly</span>}
    </span>
  );
}
