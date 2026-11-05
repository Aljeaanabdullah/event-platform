"use client";

import { Loader2, Lock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import { startPayment, type StartPaymentResult } from "@/features/payments/actions";

/** ينشئ جلسة دفع على الخادم (المبلغ من قاعدة البيانات) ثم ينتقل لصفحة المزوّد المستضافة */
export function PayButton({ orderId, amountLabel }: { orderId: string; amountLabel: string }) {
  const t = useTranslations("Payment");
  const locale = useLocale() as "ar" | "en";
  const [error, setError] = useState<Extract<StartPaymentResult, { ok: false }>["error"] | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="grid gap-3">
      <Button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await startPayment(orderId, locale);
            if (res.ok) window.location.assign(res.redirectUrl);
            else setError(res.error);
          })
        }
        className="h-12 rounded-xl bg-gradient-neon text-base font-bold text-white glow-primary"
        data-testid="pay-button"
      >
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Lock aria-hidden />}
        {t("payNow", { amount: amountLabel })}
      </Button>
      {error ? <FormAlert>{t(`startErrors.${error}`)}</FormAlert> : null}
    </div>
  );
}
