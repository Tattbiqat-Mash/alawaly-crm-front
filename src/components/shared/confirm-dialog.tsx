"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Field, fieldA11y } from "./form/field";
import { FormError } from "./states";

/**
 * Confirmation for consequential actions: states the consequence in plain words and, where the
 * API needs one, requires a reason before the action can run.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  consequence,
  confirmLabel,
  destructive,
  requireReason,
  pending,
  error,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  consequence: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  requireReason?: boolean;
  pending?: boolean;
  error?: ReactNode;
  onConfirm: (reason: string) => void;
}) {
  const t = useTranslations("common");
  const id = useId();
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const reasonError = requireReason && touched && !reason.trim() ? t("reasonRequired") : undefined;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setReason("");
          setTouched(false);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <form
          className="grid gap-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (requireReason && !reason.trim()) return;
            onConfirm(reason.trim());
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{consequence}</DialogDescription>
          </DialogHeader>
          {requireReason && (
            <Field id={`${id}-reason`} label={t("reason")} required error={reasonError}>
              <Textarea
                {...fieldA11y(`${id}-reason`, reasonError)}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </Field>
          )}
          <FormError>{error}</FormError>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" variant={destructive ? "destructive" : "default"} disabled={pending}>
              {pending && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
