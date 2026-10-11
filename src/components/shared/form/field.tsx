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
      <Label htmlFor={id}>
        {label}
        {required && (
          <span aria-hidden className="text-destructive">
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
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** Read-only value in the same rhythm as editable fields. */
export function ReadOnlyField({ label, value, className }: { label: ReactNode; value: ReactNode; className?: string }) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="flex min-h-8 items-center rounded-lg bg-muted/60 px-2.5 text-sm">{value}</span>
    </div>
  );
}
