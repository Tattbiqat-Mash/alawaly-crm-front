"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Field, fieldA11y } from "@/components/shared/form/field";
import { FormError } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useErrorMessage } from "@/hooks/use-error-message";
import { useRouter } from "@/i18n/navigation";
import { useLogin } from "../hooks";

/** Only same-app relative paths are accepted as a post-login destination (no open redirect). */
export const safeNext = (next: string | null) => (next && next.startsWith("/") && !next.startsWith("//") ? next : "/");

export function LoginForm() {
  const t = useTranslations("auth");
  const errorMessage = useErrorMessage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useLogin();

  const schema = z.object({
    email: z.string().trim().email(t("invalidEmail")),
    password: z.string().min(1, t("passwordRequired")),
  });
  type Values = z.infer<typeof schema>;

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) =>
    login.mutate(values, {
      onSuccess: () => router.replace(safeNext(searchParams.get("next"))),
      // Keep the email; clear only the password after a wrong attempt.
      onError: () => form.resetField("password"),
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <Field id="email" label={t("email")} error={errors.email?.message}>
        <Input
          {...fieldA11y("email", errors.email?.message)}
          type="email"
          autoComplete="username"
          inputMode="email"
          dir="ltr"
          autoFocus
          {...form.register("email")}
        />
      </Field>
      <Field id="password" label={t("password")} error={errors.password?.message}>
        <Input
          {...fieldA11y("password", errors.password?.message)}
          type="password"
          autoComplete="current-password"
          dir="ltr"
          {...form.register("password")}
        />
      </Field>
      {login.error && <FormError>{errorMessage(login.error)}</FormError>}
      <Button type="submit" size="lg" className="h-10" disabled={login.isPending}>
        {login.isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
        {login.isPending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
