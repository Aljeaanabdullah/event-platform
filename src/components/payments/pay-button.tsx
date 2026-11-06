"use client";

import { Loader2, Lock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import { startPayment, type StartPaymentResult } from "@/features/payments/actions";
import type { ProviderName } from "@/features/payments/types";
import { getBrowserClient } from "@/lib/supabase/client";

type StartError = Extract<StartPaymentResult, { ok: false }>["error"];
const START_ERRORS: readonly string[] = [
  "notConfigured",
  "notPayable",
  "tooManyAttempts",
  "sessionExpired",
  "providerError",
];

/** MyFatoorah عبر Edge Function: نرسل رقم الطلب واللغة فقط، والمبلغ من قاعدة البيانات */
async function startViaEdgeFunction(orderId: string, locale: "ar" | "en"): Promise<StartPaymentResult> {
  const supabase = getBrowserClient();
  if (!supabase) return { ok: false, error: "notConfigured" };
  const { data, error } = await supabase.functions.invoke<{ paymentUrl: string }>("initiate-payment", {
    body: { orderId, locale },
  });
  if (data?.paymentUrl) return { ok: true, redirectUrl: data.paymentUrl };
  const context = (error as { context?: Response } | null)?.context;
  const code = await context
    ?.json()
    .then((body: { error?: string }) => body.error)
    .catch(() => undefined);
  return { ok: false, error: (START_ERRORS.includes(code ?? "") ? code : "providerError") as StartError };
}

/** ينشئ جلسة دفع على الخادم (المبلغ من قاعدة البيانات) ثم ينتقل لصفحة المزوّد المستضافة */
export function PayButton({
  orderId,
  amountLabel,
  provider,
}: {
  orderId: string;
  amountLabel: string;
  provider: ProviderName;
}) {
  const t = useTranslations("Payment");
  const locale = useLocale() as "ar" | "en";
  const [error, setError] = useState<StartError | null>(null);
  const [pending, start] = useTransition();
  // يبقى الزر معطلًا بعد النجاح حتى يكتمل الانتقال، فلا ينشئ ضغط مزدوج فاتورة ثانية
  const [redirecting, setRedirecting] = useState(false);

  return (
    <div className="grid gap-3">
      <Button
        type="button"
        disabled={pending || redirecting}
        onClick={() =>
          start(async () => {
            setError(null);
            const res =
              provider === "myfatoorah"
                ? await startViaEdgeFunction(orderId, locale)
                : await startPayment(orderId, locale);
            if (res.ok) {
              setRedirecting(true);
              window.location.assign(res.redirectUrl);
            } else setError(res.error);
          })
        }
        className="h-12 rounded-xl bg-gradient-neon text-base font-bold text-white glow-primary"
        data-testid="pay-button"
      >
        {pending || redirecting ? <Loader2 className="animate-spin" aria-hidden /> : <Lock aria-hidden />}
        {t("payNow", { amount: amountLabel })}
      </Button>
      {error ? <FormAlert>{t(`startErrors.${error}`)}</FormAlert> : null}
    </div>
  );
}
