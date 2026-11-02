"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormAlert } from "@/components/auth/form-alert";
import { FormField, useValidationMessage } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { updateProfile } from "@/features/auth/actions";
import type { AuthErrorCode } from "@/features/auth/errors";
import { profileSchema, type ProfileInput } from "@/features/auth/schemas";
import { useRouter } from "@/i18n/navigation";

export function ProfileForm({ defaults, email }: { defaults: ProfileInput; email: string | null }) {
  const t = useTranslations("Account.profile");
  const tErr = useTranslations("AuthErrors");
  const v = useValidationMessage();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<AuthErrorCode>();

  const form = useForm<ProfileInput>({ resolver: zodResolver(profileSchema), defaultValues: defaults });
  const { errors, isDirty } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setError(undefined);
    startTransition(async () => {
      const result = await updateProfile(values);
      if (!result.ok) return setError(result.error);
      toast.success(t("saved"));
      form.reset(values);
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      {error ? (
        <div className="sm:col-span-2">
          <FormAlert>{tErr(error)}</FormAlert>
        </div>
      ) : null}

      <FormField label={t("fullName")} error={v(errors.fullName?.message)}>
        <Input autoComplete="name" className="h-11" {...form.register("fullName")} />
      </FormField>

      <FormField label={t("email")} description={t("emailHint")}>
        <Input value={email ?? ""} readOnly disabled dir="ltr" className="h-11" />
      </FormField>

      <FormField label={t("phone")} description={t("phoneHint")} error={v(errors.phone?.message)}>
        <Input
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          dir="ltr"
          className="h-11"
          {...form.register("phone")}
        />
      </FormField>

      <FormField label={t("language")}>
        <NativeSelect className="w-full [&_select]:h-11" {...form.register("preferredLocale")}>
          <NativeSelectOption value="ar">العربية</NativeSelectOption>
          <NativeSelectOption value="en">English</NativeSelectOption>
        </NativeSelect>
      </FormField>

      <div className="sm:col-span-2">
        <Button type="submit" size="lg" disabled={pending || !isDirty}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {t("save")}
        </Button>
      </div>
    </form>
  );
}
