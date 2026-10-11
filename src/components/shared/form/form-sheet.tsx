"use client";

import type { FormEventHandler, ReactNode } from "react";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useEndSide } from "@/hooks/use-end-side";

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
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  onSubmit: FormEventHandler<HTMLFormElement>;
  footer: ReactNode;
  children: ReactNode;
}) {
  const side = useEndSide();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side} className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
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
