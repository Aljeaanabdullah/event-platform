"use client";

import { useTranslations } from "next-intl";
import { cloneElement, isValidElement, useId } from "react";

import { Label } from "@/components/ui/label";
import { PASSWORD_MIN } from "@/features/auth/schemas";
import { cn } from "@/lib/utils";

type FieldChildProps = {
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

/** يترجم رمز خطأ التحقق (Validation.*) إلى نص للمستخدم */
export function useValidationMessage() {
  const t = useTranslations("Validation");
  return (key: string | undefined) => (key ? t(key as "required", { min: PASSWORD_MIN }) : undefined);
}

/**
 * حقل نموذج موحّد: تسمية، وصف، ورسالة خطأ مربوطة بـ aria-describedby
 * حتى يقرأها قارئ الشاشة عند التركيز على الحقل.
 */
export function FormField({
  label,
  description,
  error,
  optionalLabel,
  className,
  children,
}: {
  label: string;
  description?: string;
  error?: string;
  optionalLabel?: string;
  className?: string;
  children: React.ReactElement<FieldChildProps>;
}) {
  const id = useId();
  const descId = description ? `${id}-desc` : undefined;
  const errId = error ? `${id}-err` : undefined;

  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": [descId, errId].filter(Boolean).join(" ") || undefined,
      })
    : children;

  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id} className="flex items-center justify-between gap-2">
        <span>{label}</span>
        {optionalLabel ? (
          <span className="text-xs font-normal text-muted-foreground">{optionalLabel}</span>
        ) : null}
      </Label>
      {control}
      {description && !error ? (
        <p id={descId} className="text-xs text-muted-foreground">
          {description}
        </p>
      ) : null}
      {error ? (
        <p id={errId} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
