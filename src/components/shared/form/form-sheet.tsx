"use client";

import type { FormEventHandler, ReactNode } from "react";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useEndSide } from "@/hooks/use-end-side";
import { cn } from "@/lib/utils";

/**
 * Create/edit forms open in a side drawer from the logical end edge, with a scrolling body and
 * a pinned action footer (rules §13.1).
 */
export function FormSheet({
  open,
  onOpenChange,
  title,
  description,
  onSubmit,
  footer,
  wide,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  onSubmit: FormEventHandler<HTMLFormElement>;
  footer: ReactNode;
  /** Long forms with sections (e.g. a full project). */
  wide?: boolean;
  children: ReactNode;
}) {
  const side = useEndSide();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* Same data-side variant as the Sheet's own max width, or it would win on specificity. */}
      <SheetContent
        side={side}
        className={cn(
          "flex w-full flex-col gap-0 p-0",
          wide
            ? "data-[side=left]:sm:max-w-[min(64rem,92vw)] data-[side=right]:sm:max-w-[min(64rem,92vw)]"
            : "data-[side=left]:sm:max-w-lg data-[side=right]:sm:max-w-lg",
        )}
      >
        <form onSubmit={onSubmit} className="contents" noValidate>
          <SheetHeader className="border-b">
            <SheetTitle>{title}</SheetTitle>
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">{children}</div>
          <SheetFooter className="shrink-0 flex-row justify-end gap-2 border-t">{footer}</SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
