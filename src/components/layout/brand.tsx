import { cn } from "@/lib/utils";

/** Wordmark. Kept in Latin letters in both languages until the brand supplies an Arabic mark. */
export function Brand({ compact, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 font-semibold select-none", className)} dir="ltr">
      <span
        aria-hidden
        className="relative grid size-8.5 place-items-center rounded-lg bg-primary text-primary-foreground shadow-xs ring-1 ring-primary/20 transition-transform group-hover:scale-[1.02]"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="size-5"
        >
          {/* Architectural tower planes with subtle gold facet */}
          <path
            d="M3 20.5V9.5L12 4.5L21 9.5V20.5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 4.5V20.5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7.5 12H12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M7.5 16H12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Warm sand accent facet */}
          <path
            d="M16 13L17.5 14.5L19 13"
            stroke="var(--sand)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {!compact && (
        <span className="flex flex-col text-start leading-none">
          <span className="text-sm font-bold tracking-[0.22em] text-foreground">ALAWALY</span>
          <span className="mt-0.5 text-[9px] font-medium tracking-[0.25em] text-muted-foreground uppercase">
            Real Estate
          </span>
        </span>
      )}
      {compact && <span className="sr-only">Alawaly Real Estate</span>}
    </span>
  );
}
