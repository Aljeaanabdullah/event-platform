"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { FormField, useValidationMessage } from "@/components/forms/form-field";
import { PasswordInput } from "@/components/forms/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signInWithPassword } from "@/features/auth/actions";
import type { AuthErrorCode } from "@/features/auth/errors";
import { loginSchema, type LoginInput } from "@/features/auth/schemas";
import { Link } from "@/i18n/navigation";

import { FormAlert } from "./form-alert";

export function LoginForm({
  next,
  initialError,
}: {
  next: string | null;
  initialError?: AuthErrorCode | "callback";
}) {
  const t = useTranslations("Auth.login");
  const tErr = useTranslations("AuthErrors");
  const v = useValidationMessage();
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<AuthErrorCode | "callback" | undefined>(initialError);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setError(undefined);
    startTransition(async () => {
      // عند النجاح ينقل الخادم المستخدم مباشرة (redirect)
      const result = await signInWithPassword(values, locale, next);
      if (result && !result.ok) setError(result.error);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4" aria-label={t("title")}>
      {error ? <FormAlert>{tErr(error)}</FormAlert> : null}

      <FormField label={t("email")} error={v(errors.email?.message)}>
        <Input
          type="email"
          autoComplete="email"
          inputMode="email"
          dir="ltr"
          className="h-11"
          {...form.register("email")}
        />
      </FormField>

      <FormField label={t("password")} error={v(errors.password?.message)}>
        <PasswordInput autoComplete="current-password" dir="ltr" {...form.register("password")} />
      </FormField>

      <div className="-mt-1 flex justify-end">
        <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
          {t("forgot")}
        </Link>
      </div>

      <Button type="submit" size="xl" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {t("submit")}
      </Button>
    </form>
  );
}
