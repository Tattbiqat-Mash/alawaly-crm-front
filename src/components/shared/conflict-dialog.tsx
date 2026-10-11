"use client";

import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * 409 VERSION_CONFLICT / 412: someone else saved first. The user reloads the latest version
 * (their own edits are kept) and sees which fields changed underneath them.
 */
export function ConflictDialog({
  open,
  onOpenChange,
  changedFields,
  reloading,
  onReload,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Labels of fields that differ between the version the user opened and the latest one. */
  changedFields?: string[];
  reloading?: boolean;
  onReload: () => void;
}) {
  const t = useTranslations("errors.conflict");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("body")}</DialogDescription>
        </DialogHeader>
        {changedFields && changedFields.length > 0 && (
          <div className="rounded-lg border bg-muted/50 p-3 text-sm">
            <p className="mb-1 font-medium">{t("changed")}</p>
            <ul className="list-disc space-y-0.5 ps-5">
              {changedFields.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("dismiss")}
          </Button>
          <Button onClick={onReload} disabled={reloading}>
            <RefreshCw data-icon="inline-start" className={reloading ? "animate-spin" : undefined} />
            {t("reload")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
