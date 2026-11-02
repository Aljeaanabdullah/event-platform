"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Briefcase, Loader2, MailCheck, Ticket } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";

import { FormField, useValidationMessage } from "@/components/forms/form-field";
import { PasswordInput } from "@/components/forms/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signUp } from "@/features/auth/actions";
import type { AuthErrorCode } from "@/features/auth/errors";
import { registerSchema, type RegisterInput } from "@/features/auth/schemas";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import { FormAlert } from "./form-alert";

export function RegisterForm({
  defaultAccountType = "customer",
}: {
  defaultAccountType?: RegisterInput["accountType"];
}) {
  const t = useTranslations("Auth.register");
  const tErr = useTranslations("AuthErrors");
  const v = useValidationMessage();
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<AuthErrorCode>();
  const [sentTo, setSentTo] = useState<string>();

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      accountType: defaultAccountType,
    },
  });
  const { errors } = form.formState;
  const accountType = useWatch({ control: form.control, name: "accountType" });

  const onSubmit = form.handleSubmit((values) => {
    setError(undefined);
    startTransition(async () => {
      const result = await signUp(values, locale);
      if (!result) return;
      if (!result.ok) setError(result.error);
      else setSentTo(values.email);
    });
  });

  if (sentTo) {
    return (
      <div className="space-y-5 text-center" role="status">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
          <MailCheck className="size-7" aria-hidden />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">{t("checkEmailTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("checkEmailBody", { email: sentTo })}</p>
        </div>
        <Button asChild variant="outline" className="w-full" size="xl">
          <Link href="/login">{t("backToLogin")}</Link>
        </Button>
      </div>
    );
  }

  const types = [
    { value: "customer", icon: Ticket, label: t("customer"), hint: t("customerHint") },
    { value: "organizer", icon: Briefcase, label: t("organizer"), hint: t("organizerHint") },
  ] as const;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4" aria-label={t("title")}>
      {error ? <FormAlert>{tErr(error)}</FormAlert> : null}

      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-sm font-medium">{t("accountType")}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {types.map(({ value, icon: Icon, label, hint }) => (
            <label
              key={value}
              className={cn(
                "relative flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors hover:border-primary/40",
                "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/50",
                accountType === value && "border-primary bg-primary/5",
              )}
            >
              <input type="radio" value={value} className="sr-only" {...form.register("accountType")} />
              <Icon
                className={cn(
                  "mt-0.5 size-5 shrink-0",
                  accountType === value ? "text-primary" : "text-muted-foreground",
                )}
                aria-hidden
              />
              <span className="grid gap-0.5">
                <span className="text-sm font-semibold">{label}</span>
                <span className="text-xs leading-snug text-muted-foreground">{hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <FormField label={t("fullName")} error={v(errors.fullName?.message)}>
        <Input autoComplete="name" className="h-11" {...form.register("fullName")} />
      </FormField>

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

      <FormField label={t("password")} description={t("passwordHint")} error={v(errors.password?.message)}>
        <PasswordInput autoComplete="new-password" dir="ltr" {...form.register("password")} />
      </FormField>

      <FormField label={t("confirmPassword")} error={v(errors.confirmPassword?.message)}>
        <PasswordInput autoComplete="new-password" dir="ltr" {...form.register("confirmPassword")} />
      </FormField>

      <Button type="submit" size="xl" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {t("submit")}
      </Button>

      <p className="text-center text-xs text-muted-foreground">{t("terms")}</p>
    </form>
  );
}
