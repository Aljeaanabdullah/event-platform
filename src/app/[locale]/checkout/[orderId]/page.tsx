import { CreditCard } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/account/section-card";
import { CancelOrderButton } from "@/components/booking/cancel-order-button";
import { HoldCountdown } from "@/components/booking/hold-countdown";
import { OrderSummary } from "@/components/booking/order-summary";
import { getMyOrder } from "@/features/booking/queries";
import type { Locale } from "@/i18n/routing";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * صفحة الدفع: ملخص الطلب من قاعدة البيانات + عدّاد الحجز المؤقت + إلغاء.
 * الطلب المدفوع/المنتهي يُحوَّل لصفحة الطلب (لا دفع مكرر).
 */
export default async function CheckoutPage({ params }: PageProps<"/[locale]/checkout/[orderId]">) {
  const { locale: rawLocale, orderId } = await params;
  const locale = rawLocale as Locale;
  const user = await requireUser(locale, `/${locale}/checkout/${orderId}`);
  const order = await getMyOrder(orderId, user.userId);
  if (order.status !== "pending_payment") redirect(`/${locale}/account/orders/${order.id}`);

  const t = await getTranslations("Checkout");

  return (
    <div className="mx-auto grid max-w-3xl gap-6 px-4 py-10 sm:px-6" data-testid="checkout">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      {order.expires_at ? <HoldCountdown expiresAt={order.expires_at} /> : null}
      <OrderSummary order={order} />
      <section aria-labelledby="pay-title" className="glass grid gap-3 rounded-3xl p-5 sm:p-6">
        <h2 id="pay-title" className="flex items-center gap-2 text-lg font-bold">
          <CreditCard className="size-5 text-primary" aria-hidden />
          {t("paymentTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("paymentPending")}</p>
      </section>
      <div>
        <CancelOrderButton orderId={order.id} />
      </div>
    </div>
  );
}
