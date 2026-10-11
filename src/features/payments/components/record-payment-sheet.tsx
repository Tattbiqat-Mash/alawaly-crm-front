"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Field, fieldA11y } from "@/components/shared/form/field";
import { FormSheet } from "@/components/shared/form/form-sheet";
import { applyServerErrors } from "@/components/shared/form/server-errors";
import { FormError } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAYMENT_METHODS } from "@/config/statuses";
import { useErrorMessage } from "@/hooks/use-error-message";
import { toApiError } from "@/lib/api/errors";
import { useIdempotencyKey } from "@/lib/api/idempotency";
import { formatMoney, fromMinor, toMinor } from "@/lib/format/money";
import { useConfirmOffline } from "../hooks";

type Values = {
  target: "installment" | "reservation";
  targetId: string;
  amount: string;
  method: (typeof PAYMENT_METHODS)[number];
  reference: string;
};

/** First check of an offline payment (finance.confirm). It is not paid until a second person approves. */
export function RecordPaymentSheet({ onClose }: { onClose: () => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const confirm = useConfirmOffline();
  const idempotency = useIdempotencyKey();
  const [formError, setFormError] = useState<string | null>(null);

  const required = t("validation.required");
  const schema = z.object({
    target: z.enum(["installment", "reservation"]),
    targetId: z.string().regex(/^\d+$/, required),
    amount: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, t("newSale.priceInvalid")),
    method: z.enum(PAYMENT_METHODS),
    reference: z.string().trim().min(1, required).max(120),
  });
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { target: "installment", targetId: "", amount: "", method: "bank_transfer", reference: "" },
  });
  const { errors } = form.formState;
  const err = (k: keyof Values) => errors[k]?.message;

  const onSubmit = form.handleSubmit((v) => {
    setFormError(null);
    const body = {
      ...(v.target === "installment" ? { payment_id: Number(v.targetId) } : { reservation_id: Number(v.targetId) }),
      amount: fromMinor(toMinor(v.amount)!),
      method: v.method,
      reference: v.reference.trim(),
    };
    confirm.mutate(
      { body, key: idempotency.key },
      {
        onSuccess: (tx) => {
          idempotency.renew();
          toast.success(t("confirmations.recorded", { id: tx.id }));
          onClose();
        },
        onError: (e) => {
          const apiError = toApiError(e);
          if (apiError.code === "IDEMPOTENCY_CONFLICT") idempotency.renew();
          if (apiError.code === "AMOUNT_MISMATCH" && apiError.details?.due !== undefined) {
            form.setError("amount", {
              type: "server",
              message: `${errorMessage(apiError)} ${formatMoney(apiError.details.due as string, locale)}`,
            });
            return;
          }
          if (!applyServerErrors(e, form.setError, ["amount", "method", "reference"], { payment_id: "targetId", reservation_id: "targetId" }))
            setFormError(errorMessage(e));
        },
      },
    );
  });

  return (
    <FormSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={t("confirmations.recordTitle")}
      onSubmit={onSubmit}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={confirm.isPending}>
            {confirm.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
            {t("confirmations.record")}
          </Button>
        </>
      }
    >
      <p className="flex gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
        <Info aria-hidden className="size-4 shrink-0" />
        {t("confirmations.recordBody")}
      </p>
      <fieldset disabled={confirm.isPending} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="cp-target" label={t("confirmations.target")} required>
            <Controller
              control={form.control}
              name="target"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="cp-target" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="installment">{t("confirmations.targets.installment")}</SelectItem>
                    <SelectItem value="reservation">{t("confirmations.targets.reservation")}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field id="cp-id" label={t("confirmations.targetId")} required error={err("targetId")} description={t("confirmations.targetIdHint")}>
            <Input {...fieldA11y("cp-id", err("targetId"), true)} inputMode="numeric" dir="ltr" {...form.register("targetId")} />
          </Field>
        </div>
        <Field id="cp-amount" label={t("confirmations.amount")} required error={err("amount")} description={t("confirmations.amountHint")}>
          <Input {...fieldA11y("cp-amount", err("amount"), true)} inputMode="decimal" dir="ltr" {...form.register("amount")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="cp-method" label={t("confirmations.method")} required>
            <Controller
              control={form.control}
              name="method"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="cp-method" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {t(`statuses.paymentMethod.${m}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field id="cp-ref" label={t("confirmations.reference")} required error={err("reference")}>
            <Input {...fieldA11y("cp-ref", err("reference"))} dir="ltr" {...form.register("reference")} />
          </Field>
        </div>
      </fieldset>
      <FormError>{formError}</FormError>
    </FormSheet>
  );
}
