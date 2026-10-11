"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { useErrorMessage } from "@/hooks/use-error-message";
import { Link, useRouter } from "@/i18n/navigation";
import { toApiError } from "@/lib/api/errors";
import { ownerAuthApi } from "../api";

const CODE_LENGTH = 6;
const RESEND_AFTER = 45;

function useCountdown(seconds: number) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) return;
    const timer = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);
  return [left, () => setLeft(seconds)] as const;
}

// O02 — Enter the code. Auto-submits on the sixth digit; supports one-time-code autofill.
export function OwnerVerifyForm() {
  const t = useTranslations("owner.verify");
  const errorMessage = useErrorMessage();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [left, restart] = useCountdown(RESEND_AFTER);

  const verify = useMutation({
    mutationFn: ownerAuthApi.verify,
    onSuccess: () => {
      router.replace("/owner");
      router.refresh();
    },
    // A wrong code clears the boxes; the phone is kept server-side for another try.
    onError: () => setCode(""),
  });
  const resend = useMutation({
    mutationFn: () => ownerAuthApi.requestCode(""),
    onSuccess: () => {
      restart();
      toast.success(t("resent"));
    },
  });

  const submit = (value: string) => {
    if (value.length === CODE_LENGTH && !verify.isPending) verify.mutate(value);
  };

  const error = verify.error ?? resend.error;
  const expired = error && toApiError(error).code === "CODE_SESSION_EXPIRED";
  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, "0");

  return (
    <form
      noValidate
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit(code);
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="otp">{t("code")}</Label>
        {/* Digits read left to right in both languages. */}
        <div dir="ltr" className="flex justify-center">
          <InputOTP
            id="otp"
            maxLength={CODE_LENGTH}
            value={code}
            onChange={(v) => setCode(v.replace(/\D/g, ""))}
            onComplete={submit}
            autoComplete="one-time-code"
            inputMode="numeric"
            pattern="^[0-9]+$"
            autoFocus
            disabled={verify.isPending}
            aria-invalid={Boolean(verify.error) || undefined}
          >
            <InputOTPGroup>
              {Array.from({ length: CODE_LENGTH }, (_, i) => (
                <InputOTPSlot key={i} index={i} className="size-12 text-lg" />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
        <p className="text-center text-xs text-muted-foreground">{t("note")}</p>
      </div>

      {error && (
        <FormError>
          {errorMessage(error)}{" "}
          {expired && (
            <Link href="/owner/sign-in" className="font-medium underline">
              {t("changeNumber")}
            </Link>
          )}
        </FormError>
      )}

      <Button type="submit" className="h-12 text-base" disabled={code.length !== CODE_LENGTH || verify.isPending}>
        {verify.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
        {verify.isPending ? t("submitting") : t("submit")}
      </Button>

      <div className="flex items-center justify-between text-sm">
        <Link href="/owner/sign-in" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          {t("changeNumber")}
        </Link>
        {left > 0 ? (
          <span className="num text-muted-foreground" aria-live="polite">
            {t("resendIn", { time: `${mm}:${ss}` })}
          </span>
        ) : (
          <Button type="button" variant="link" className="h-auto p-0" disabled={resend.isPending} onClick={() => resend.mutate()}>
            {t("resend")}
          </Button>
        )}
      </div>
    </form>
  );
}
