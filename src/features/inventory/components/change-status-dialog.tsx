"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Field, fieldA11y } from "@/components/shared/form/field";
import { FormError } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { STAFF_STATUS_TARGETS } from "@/config/statuses";
import { usePermissions } from "@/features/auth/hooks";
import { useErrorMessage } from "@/hooks/use-error-message";
import { toApiError } from "@/lib/api/errors";
import { useIdempotencyKey } from "@/lib/api/idempotency";
import { useChangeUnitStatus, useUnit } from "../hooks";
import type { StatusChangeInput, VersionedUnit } from "../types";

type Target = StatusChangeInput["status"];

/**
 * POST /units/{id}/status with If-Match and an Idempotency-Key created when the dialog opens.
 * Leaving "sold" is an override: it needs inventory.status.override, a reason and a clear warning.
 */
export function ChangeStatusDialog({ data, open, onOpenChange }: { data: VersionedUnit; open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useTranslations();
  const errorMessage = useErrorMessage();
  const { can } = usePermissions();
  const change = useChangeUnitStatus(data.unit.id);
  const unitQuery = useUnit(data.unit.id);
  const idempotency = useIdempotencyKey();

  const current = data.unit.status;
  const targets = STAFF_STATUS_TARGETS.filter((s) => s !== current);
  const [target, setTarget] = useState<Target | "">("");
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOverride = current === "sold";
  const blocked = isOverride && !can("inventory.status.override");
  const reasonRequired = isOverride;
  const reasonError = submitted && reasonRequired && !reason.trim() ? t("common.reasonRequired") : undefined;

  const close = (next: boolean) => {
    if (!next) {
      setTarget("");
      setReason("");
      setSubmitted(false);
      setError(null);
      change.reset();
    }
    onOpenChange(next);
  };

  const submit = () => {
    setSubmitted(true);
    setError(null);
    if (!target || (reasonRequired && !reason.trim())) return;
    change.mutate(
      { input: { status: target, reason: reason.trim() || undefined }, etag: data.etag, idempotencyKey: idempotency.key },
      {
        onSuccess: () => {
          idempotency.renew();
          toast.success(t("units.statusDialog.done", { status: t(`statuses.unit.${target}`) }));
          close(false);
        },
        onError: (err) => {
          const e = toApiError(err);
          // A new intent after a conflict: fresh version, fresh key.
          if (e.isConflict || e.code === "IDEMPOTENCY_CONFLICT") {
            idempotency.renew();
            unitQuery.refetch();
          }
          setError(errorMessage(e));
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <form
          noValidate
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("units.statusDialog.title")}</DialogTitle>
            <DialogDescription>{t("units.statusDialog.description")}</DialogDescription>
          </DialogHeader>

          {isOverride && (
            <p role="alert" className="flex gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
              <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
              {blocked ? t("units.statusDialog.fromSoldNoPermission") : t("units.statusDialog.fromSold")}
            </p>
          )}

          <Field id="status-target" label={t("units.statusDialog.target")} required>
            <Select value={target} onValueChange={(v) => setTarget(v as Target)} disabled={blocked}>
              <SelectTrigger {...fieldA11y("status-target")} className="w-full">
                <SelectValue placeholder={t("units.statusDialog.target")} />
              </SelectTrigger>
              <SelectContent>
                {targets.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`statuses.unit.${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field id="status-reason" label={t("common.reason")} required={reasonRequired} error={reasonError}>
            <Textarea
              {...fieldA11y("status-reason", reasonError)}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("units.statusDialog.reasonPlaceholder")}
              disabled={blocked}
            />
          </Field>

          <FormError>{error}</FormError>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => close(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant={isOverride ? "destructive" : "default"} disabled={blocked || !target || change.isPending}>
              {change.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {t("units.statusDialog.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
