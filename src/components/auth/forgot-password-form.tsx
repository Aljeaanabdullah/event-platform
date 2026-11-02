"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MailCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { FormField, useValidationMessage } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestPasswordReset } from "@/features/auth/actions";
import type { AuthErrorCode } from "@/features/auth/errors";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/features/auth/schemas";
import { Link } from "@/i18n/navigation";

import { FormAlert } from "./form-alert";

export function ForgotPasswordForm() {
  const t = useTranslations("Auth.forgot");
  const tErr = useTranslations("AuthErrors");
  const v = useValidationMessage();
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<AuthErrorCode>();
  const [sent, setSent] = useState(false);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    setError(undefined);
    startTransition(async () => {
      const result = await requestPasswordReset(values, locale);
      if (!result.ok) setError(result.error);
      else setSent(true);
    });
  });

  if (sent) {
    // نفس الرسالة دائمًا: لا نكشف إن كان البريد مسجلًا أم لا
    return (
      <div className="space-y-5 text-center" role="status">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
          <MailCheck className="size-7" aria-hidden />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">{t("sentTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("sentBody")}</p>
        </div>
        <Button asChild variant="outline" className="w-full" size="xl">
          <Link href="/login">{t("backToLogin")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4" aria-label={t("title")}>
      {error ? <FormAlert>{tErr(error)}</FormAlert> : null}
      <FormField label={t("email")} error={v(form.formState.errors.email?.message)}>
        <Input
          type="email"
          autoComplete="email"
          inputMode="email"
          dir="ltr"
          className="h-11"
          {...form.register("email")}
        />
      </FormField>
      <Button type="submit" size="xl" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {t("submit")}
      </Button>
    </form>
  );
}
