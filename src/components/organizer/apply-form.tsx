"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormAlert } from "@/components/auth/form-alert";
import { FormField, useValidationMessage } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { applyAsOrganizer, type ApplyResult } from "@/features/organizer/actions";
import { organizerApplicationSchema, type OrganizerApplicationInput } from "@/features/organizer/schemas";
import { useRouter } from "@/i18n/navigation";

const textareaClass =
  "border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive min-h-24 w-full rounded-lg border bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:ring-3";

export function OrganizerApplyForm({ defaultEmail }: { defaultEmail: string }) {
  const t = useTranslations("Organizer.applyForm");
  const tCommon = useTranslations("Common");
  const tErr = useTranslations("AuthErrors");
  const v = useValidationMessage();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<Exclude<ApplyResult, { ok: true }>["error"]>();

  const form = useForm<OrganizerApplicationInput>({
    resolver: zodResolver(organizerApplicationSchema),
    defaultValues: {
      nameAr: "",
      nameEn: "",
      slug: "",
      contactEmail: defaultEmail,
      contactPhone: "",
      websiteUrl: "",
      commercialRegNo: "",
      descriptionAr: "",
      descriptionEn: "",
    },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setError(undefined);
    startTransition(async () => {
      const result = await applyAsOrganizer(values);
      if (!result.ok) return setError(result.error);
      toast.success(t("success"));
      router.push("/organizer");
      router.refresh();
    });
  });

  const optional = tCommon("optional");

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <p className="flex items-start gap-2 rounded-xl bg-accent/60 px-3.5 py-3 text-sm text-accent-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t("reviewNote")}
        </p>
      </div>
      {error ? (
        <div className="sm:col-span-2">
          <FormAlert>{tErr(error)}</FormAlert>
        </div>
      ) : null}

      <FormField label={t("nameAr")} error={v(errors.nameAr?.message)}>
        <Input dir="rtl" lang="ar" className="h-11" {...form.register("nameAr")} />
      </FormField>
      <FormField label={t("nameEn")} error={v(errors.nameEn?.message)}>
        <Input dir="ltr" lang="en" className="h-11" {...form.register("nameEn")} />
      </FormField>
      <FormField label={t("slug")} description={t("slugHint")} error={v(errors.slug?.message)}>
        <Input
          dir="ltr"
          autoCapitalize="none"
          spellCheck={false}
          className="h-11"
          {...form.register("slug")}
        />
      </FormField>
      <FormField label={t("contactEmail")} error={v(errors.contactEmail?.message)}>
        <Input
          type="email"
          dir="ltr"
          autoComplete="email"
          className="h-11"
          {...form.register("contactEmail")}
        />
      </FormField>
      <FormField label={t("contactPhone")} optionalLabel={optional} error={v(errors.contactPhone?.message)}>
        <Input type="tel" dir="ltr" autoComplete="tel" className="h-11" {...form.register("contactPhone")} />
      </FormField>
      <FormField label={t("website")} optionalLabel={optional} error={v(errors.websiteUrl?.message)}>
        <Input
          type="url"
          dir="ltr"
          placeholder="https://"
          className="h-11"
          {...form.register("websiteUrl")}
        />
      </FormField>
      <FormField
        label={t("commercialRegNo")}
        optionalLabel={optional}
        error={v(errors.commercialRegNo?.message)}
      >
        <Input dir="ltr" className="h-11" {...form.register("commercialRegNo")} />
      </FormField>
      <div className="hidden sm:block" />
      <FormField label={t("descriptionAr")} optionalLabel={optional} error={v(errors.descriptionAr?.message)}>
        <textarea dir="rtl" lang="ar" className={textareaClass} {...form.register("descriptionAr")} />
      </FormField>
      <FormField label={t("descriptionEn")} optionalLabel={optional} error={v(errors.descriptionEn?.message)}>
        <textarea dir="ltr" lang="en" className={textareaClass} {...form.register("descriptionEn")} />
      </FormField>

      <div className="sm:col-span-2">
        <Button type="submit" size="xl" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {t("submit")}
        </Button>
      </div>
    </form>
  );
}
