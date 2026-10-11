"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Field, fieldA11y } from "@/components/shared/form/field";
import { applyServerErrors } from "@/components/shared/form/server-errors";
import { FormError } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useErrorMessage } from "@/hooks/use-error-message";
import { toApiError } from "@/lib/api/errors";
import { useIdempotencyKey } from "@/lib/api/idempotency";
import { todayIso } from "@/lib/format/dates";
import { formatMoney, fromMinor, toMinor } from "@/lib/format/money";
import { useRequestPriceChange } from "../hooks";
import { PRICE_FIELDS, type PriceField, type Unit } from "../types";

/**
 * Four-eyes pricing: this only files a request. The price stays the same until a different
 * person approves it (S05), so nothing here ever presents the change as done.
 */
export function PriceChangeDialog({ unit, open, onOpenChange }: { unit: Unit; open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const request = useRequestPriceChange(unit.id);
  const idempotency = useIdempotencyKey();
  const [formError, setFormError] = useState<string | null>(null);

  const schema = z.object({
    field: z.enum(PRICE_FIELDS),
    new_value: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, t("units.priceDialog.invalidAmount")),
    reason: z.string().trim().max(500),
    effective_from: z.string(),
  });
  type Values = z.infer<typeof schema>;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { field: "price_in_tax", new_value: "", reason: "", effective_from: "" },
  });
  const { errors } = form.formState;
  const field = useWatch({ control: form.control, name: "field" });

  const close = (next: boolean) => {
    if (!next) {
      form.reset();
      setFormError(null);
      request.reset();
    }
    onOpenChange(next);
  };

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    request.mutate(
      {
        input: {
          field: values.field,
          new_value: fromMinor(toMinor(values.new_value)!),
          reason: values.reason || undefined,
          effective_from: values.effective_from || undefined,
        },
        idempotencyKey: idempotency.key,
      },
      {
        onSuccess: () => {
          idempotency.renew();
          toast.success(t("units.priceDialog.done"));
          close(false);
        },
        onError: (err) => {
          const e = toApiError(err);
          if (e.code === "IDEMPOTENCY_CONFLICT") idempotency.renew();
          if (!applyServerErrors(e, form.setError, ["field", "new_value", "reason", "effective_from"])) setFormError(errorMessage(e));
        },
      },
    );
  });

  const currentValue = unit[field as PriceField];

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{t("units.priceDialog.title")}</DialogTitle>
            <DialogDescription className="flex gap-2">
              <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
              {t("units.priceDialog.description")}
            </DialogDescription>
          </DialogHeader>

          <Field id="price-field" label={t("units.priceDialog.field")} description={t("units.priceDialog.current", { value: formatMoney(currentValue, locale) })}>
            <Controller
              control={form.control}
              name="field"
              render={({ field: f }) => (
                <Select value={f.value} onValueChange={f.onChange}>
                  <SelectTrigger {...fieldA11y("price-field", undefined, true)} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICE_FIELDS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {t(`units.priceDialog.fields.${p}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field id="price-new" label={t("units.priceDialog.newValue")} required error={errors.new_value?.message}>
            <Input {...fieldA11y("price-new", errors.new_value?.message)} inputMode="decimal" dir="ltr" autoComplete="off" {...form.register("new_value")} />
          </Field>

          <Field id="price-reason" label={t("common.reason")} error={errors.reason?.message}>
            <Textarea
              {...fieldA11y("price-reason", errors.reason?.message)}
              rows={2}
              placeholder={t("units.priceDialog.reasonPlaceholder")}
              {...form.register("reason")}
            />
          </Field>

          <Field id="price-effective" label={t("units.priceDialog.effectiveFrom")} error={errors.effective_from?.message}>
            <Input {...fieldA11y("price-effective", errors.effective_from?.message)} type="date" min={todayIso()} dir="ltr" {...form.register("effective_from")} />
          </Field>

          <FormError>{formError}</FormError>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => close(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={request.isPending}>
              {request.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {t("units.priceDialog.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
