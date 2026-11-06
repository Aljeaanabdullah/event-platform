import { CreditCard, FlaskConical, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/account/section-card";
import { FormAlert } from "@/components/auth/form-alert";
import { CancelOrderButton } from "@/components/booking/cancel-order-button";
import { HoldCountdown } from "@/components/booking/hold-countdown";
import { OrderSummary } from "@/components/booking/order-summary";
import { PayButton } from "@/components/payments/pay-button";
import { getMyOrder } from "@/features/booking/queries";
import { getProvider } from "@/features/payments/config";
import type { Locale } from "@/i18n/routing";
import { requireUser } from "@/lib/auth/session";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * صفحة الدفع: ملخص الطلب من قاعدة البيانات + عدّاد الحجز المؤقت + الدفع عبر صفحة المزوّد المستضافة.
 * الطلب المدفوع/المنتهي يُحوَّل لصفحة الطلب (لا دفع مكرر). لا نجمع بيانات البطاقة إطلاقًا.
 */
export default async function CheckoutPage({ params }: PageProps<"/[locale]/checkout/[orderId]">) {
  const { locale: rawLocale, orderId } = await params;
  const locale = rawLocale as Locale;
  const user = await requireUser(locale, `/${locale}/checkout/${orderId}`);
  const order = await getMyOrder(orderId, user.userId);
  if (order.status !== "pending_payment") redirect(`/${locale}/account/orders/${order.id}`);

  const [t, tPay] = await Promise.all([getTranslations("Checkout"), getTranslations("Payment")]);
  const provider = getProvider();
  const latest = [...order.payments].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

  return (
    <div className="mx-auto grid max-w-3xl gap-6 px-4 py-10 sm:px-6" data-testid="checkout">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      {order.expires_at ? <HoldCountdown expiresAt={order.expires_at} /> : null}
      {latest?.status === "failed" ? <FormAlert>{tPay("lastFailed")}</FormAlert> : null}
      <OrderSummary order={order} />
      <section aria-labelledby="pay-title" className="glass grid gap-4 rounded-3xl p-5 sm:p-6">
        <h2 id="pay-title" className="flex items-center gap-2 text-lg font-bold">
          <CreditCard className="size-5 text-primary" aria-hidden />
          {t("paymentTitle")}
        </h2>
        {provider ? (
          <>
            {provider.name === "mock" ? (
              <p
                className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200"
                data-testid="sandbox-note"
              >
                <FlaskConical className="size-4" aria-hidden />
                {tPay("sandboxNote")}
              </p>
            ) : null}
            <PayButton
              orderId={order.id}
              amountLabel={formatMoney(Number(order.total_fils), locale)}
              provider={provider.name}
            />
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-4" aria-hidden />
              {tPay("hostedNote")}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground" data-testid="payments-disabled">
            {tPay("notConfigured")}
          </p>
        )}
      </section>
      <div>
        <CancelOrderButton orderId={order.id} />
      </div>
    </div>
  );
}
