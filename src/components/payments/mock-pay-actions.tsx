"use client";

import { Ban, CheckCircle2, XCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import { completeMockPayment, type MockCompleteResult } from "@/features/payments/actions";
import type { MockOutcome } from "@/features/payments/providers/mock";
import { useRouter } from "@/i18n/navigation";

/** أزرار محاكاة نتيجة الدفع — بلا أي بيانات بطاقة */
export function MockPayActions({ paymentId, orderId }: { paymentId: string; orderId: string }) {
  const t = useTranslations("Payment.mock");
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState<Extract<MockCompleteResult, { ok: false }>["error"] | null>(null);
  const [pending, start] = useTransition();

  const run = (outcome: MockOutcome) =>
    start(async () => {
      setError(null);
      const res = await completeMockPayment(paymentId, outcome);
      if (res.ok) router.push(`/checkout/${res.orderId}/status`);
      else setError(res.error);
    });

  return (
    <div className="grid gap-3">
      <Button
        type="button"
        disabled={pending}
        onClick={() => run("paid")}
        className="h-12 bg-emerald-600 text-white hover:bg-emerald-700"
        data-testid="mock-pay-success"
      >
        <CheckCircle2 aria-hidden />
        {t("succeed")}
      </Button>
      <Button
        type="button"
        disabled={pending}
        variant="outline"
        onClick={() => run("failed")}
        data-testid="mock-pay-fail"
      >
        <XCircle aria-hidden />
        {t("fail")}
      </Button>
      <Button
        type="button"
        disabled={pending}
        variant="ghost"
        onClick={() => run("cancelled")}
        data-testid="mock-pay-cancel"
      >
        <Ban aria-hidden />
        {t("cancel")}
      </Button>
      {error ? (
        <FormAlert>
          {t(`errors.${error}`)}
          {error === "serverKeyMissing" ? (
            <a href={`/${locale}/checkout/${orderId}`} className="mt-1 block underline">
              {t("backToCheckout")}
            </a>
          ) : null}
        </FormAlert>
      ) : null}
    </div>
  );
}
