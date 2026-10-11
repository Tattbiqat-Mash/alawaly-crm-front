"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2, Smartphone } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Field, fieldA11y } from "@/components/shared/form/field";
import { FormError } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useErrorMessage } from "@/hooks/use-error-message";
import { useRouter } from "@/i18n/navigation";
import { ownerAuthApi } from "../api";
import { normalizeSaudiMobile } from "../phone";

// O01 — Sign in with phone. The API always answers {sent:true}, so we always move on to the
// code screen and never reveal whether a number is registered.
export function OwnerSignInForm() {
  const t = useTranslations("owner.signIn");
  const errorMessage = useErrorMessage();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [invalid, setInvalid] = useState(false);
  const send = useMutation({ mutationFn: ownerAuthApi.requestCode, onSuccess: () => router.push("/owner/verify") });

  const error = invalid ? t("invalidPhone") : undefined;

  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const normalized = normalizeSaudiMobile(phone);
        setInvalid(!normalized);
        if (normalized) send.mutate(normalized);
      }}
    >
      <Field id="phone" label={t("phone")} error={error} description={t("hint")}>
        <div className="relative">
          <Smartphone aria-hidden className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            {...fieldA11y("phone", error, t("hint"))}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            autoFocus
            placeholder={t("phonePlaceholder")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-12 ps-9 text-base"
          />
        </div>
      </Field>
      {send.error && <FormError>{errorMessage(send.error)}</FormError>}
      <Button type="submit" className="h-12 text-base" disabled={send.isPending}>
        {send.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
        {send.isPending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
