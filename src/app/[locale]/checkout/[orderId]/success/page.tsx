import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PaymentStatusView, viewFor } from "@/components/payments/payment-status-view";
import { getMyOrder } from "@/features/booking/queries";
import type { Locale } from "@/i18n/routing";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** الرابط وحده لا يثبت شيئًا: إن لم تطابق قاعدة البيانات هذه الحالة نعود لصفحة الحالة العامة */
export default async function PaymentSuccessPage({
  params,
}: PageProps<"/[locale]/checkout/[orderId]/success">) {
  const { locale: rawLocale, orderId } = await params;
  const locale = rawLocale as Locale;
  const user = await requireUser(locale, `/${locale}/checkout/${orderId}/success`);
  const order = await getMyOrder(orderId, user.userId);
  if (viewFor(order) !== "success") redirect(`/${locale}/checkout/${order.id}/status`);
  return <PaymentStatusView order={order} view="success" />;
}
