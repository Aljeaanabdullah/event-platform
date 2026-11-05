import { FlaskConical, ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { MockPayActions } from "@/components/payments/mock-pay-actions";
import { isMockAllowed } from "@/features/payments/config";
import type { Locale } from "@/i18n/routing";
import { requireUser } from "@/lib/auth/session";
import { formatMoney } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * "صفحة الدفع المستضافة" للمزوّد الوهمي (تطوير/اختبار فقط — 404 في Production).
 * لا تطلب أي بيانات بطاقة. تعرض المبلغ من قاعدة البيانات، والمختبر يختار النتيجة.
 */
export default async function MockPaymentPage({ params }: PageProps<"/[locale]/payments/mock/[paymentId]">) {
  if (!isMockAllowed()) notFound();
  const { locale: rawLocale, paymentId } = await params;
  const locale = rawLocale as Locale;
  await requireUser(locale, `/${locale}/payments/mock/${paymentId}`);
  if (!/^[0-9a-f-]{36}$/.test(paymentId)) notFound();

  const supabase = await createClient();
  const { data: payment } = await supabase
    .from("payments")
    .select("id, order_id, provider, status, amount_fils, orders (order_number)")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment || payment.provider !== "mock") notFound();
  const t = await getTranslations("Payment.mock");

  return (
    <div className="mx-auto grid max-w-md gap-5 px-4 py-12">
      <div
        className="flex items-start gap-3 rounded-2xl border-2 border-dashed border-amber-500/60 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-100"
        role="note"
      >
        <FlaskConical className="mt-0.5 size-5 shrink-0" aria-hidden />
        <p>
          <strong className="block">{t("bannerTitle")}</strong>
          {t("bannerBody")}
        </p>
      </div>
      <section
        className="glass grid gap-4 rounded-3xl p-6"
        aria-labelledby="mock-title"
        data-testid="mock-payment"
      >
        <h1 id="mock-title" className="text-2xl font-bold">
          {t("title")}
        </h1>
        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t("order")}</dt>
            <dd dir="ltr" className="font-mono">
              {payment.orders?.order_number}
            </dd>
          </div>
          <div className="flex justify-between text-lg font-bold">
            <dt>{t("amount")}</dt>
            <dd dir="auto" data-testid="mock-amount">
              {formatMoney(Number(payment.amount_fils), locale)}
            </dd>
          </div>
        </dl>
        {payment.status === "pending" ? (
          <MockPayActions paymentId={payment.id} orderId={payment.order_id} />
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldAlert className="size-4" aria-hidden />
            {t("alreadyHandled")}
          </p>
        )}
      </section>
    </div>
  );
}
