"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormField, useValidationMessage } from "@/components/forms/form-field";
import { PasswordInput } from "@/components/forms/password-input";
import { Button } from "@/components/ui/button";
import { updatePassword } from "@/features/auth/actions";
import type { AuthErrorCode } from "@/features/auth/errors";
import { resetPasswordSchema, type ResetPasswordInput } from "@/features/auth/schemas";
import { useRouter } from "@/i18n/navigation";

import { FormAlert } from "./form-alert";

/**
 * نموذج كلمة مرور جديدة — يُستخدم في صفحة إعادة التعيين وفي إعدادات الأمان بالحساب.
 * labels: نصوص الحقول حسب السياق.
 */
export function NewPasswordForm({
  labels,
  redirectTo,
}: {
  labels: { password: string; confirmPassword: string; submit: string; success: string };
  redirectTo?: string;
}) {
  const tErr = useTranslations("AuthErrors");
  const tHint = useTranslations("Auth.register");
  const v = useValidationMessage();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<AuthErrorCode>();

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setError(undefined);
    startTransition(async () => {
      const result = await updatePassword(values);
      if (!result.ok) return setError(result.error);
      toast.success(labels.success);
      form.reset();
      if (redirectTo) router.push(redirectTo);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      {error ? <FormAlert>{tErr(error)}</FormAlert> : null}
      <FormField
        label={labels.password}
        description={tHint("passwordHint")}
        error={v(errors.password?.message)}
      >
        <PasswordInput autoComplete="new-password" dir="ltr" {...form.register("password")} />
      </FormField>
      <FormField label={labels.confirmPassword} error={v(errors.confirmPassword?.message)}>
        <PasswordInput autoComplete="new-password" dir="ltr" {...form.register("confirmPassword")} />
      </FormField>
      <Button type="submit" size="xl" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {labels.submit}
      </Button>
    </form>
  );
}
