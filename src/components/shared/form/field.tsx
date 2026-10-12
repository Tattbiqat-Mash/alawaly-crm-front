import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** ARIA wiring for a control rendered inside <Field>. */
export function fieldA11y(id: string, error?: string, description?: ReactNode) {
  const describedBy = [error && `${id}-error`, description && `${id}-description`].filter(Boolean).join(" ");
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy || undefined,
  } as const;
}

export function Field({
  id,
  label,
  error,
  description,
  required,
  children,
  className,
}: {
  id: string;
  label: ReactNode;
  error?: string;
  description?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id} className="text-xs font-semibold text-foreground/90">
        {label}
        {required && (
          <span aria-hidden className="ms-1 text-destructive font-bold">
            *
          </span>
        )}
      </Label>
      {children}
      {description && !error && (
        <p id={`${id}-description`} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive font-medium">
          {error}
        </p>
      )}
    </div>
  );
}

/** Read-only value in the same rhythm as editable fields. */
export function ReadOnlyField({ label, value, className }: { label: ReactNode; value: ReactNode; className?: string }) {
  return (
    <div className={cn("grid gap-1", className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="flex min-h-8 items-center rounded-lg border border-border/60 bg-background/80 px-2.5 text-xs sm:text-sm shadow-2xs">{value}</span>
    </div>
  );
}
