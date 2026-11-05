import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PaymentStatusView, viewFor, type PaymentView } from "@/components/payments/payment-status-view";
import { getMyOrder } from "@/features/booking/queries";
import type { Locale } from "@/i18n/routing";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const dedicated: Partial<Record<PaymentView, string>> = {
  success: "success",
  failed: "failed",
  cancelled: "cancelled",
};

/** صفحة حالة الدفع: تقرأ قاعدة البيانات وتوجّه إلى صفحة النجاح/الفشل/الإلغاء، أو تعرض "قيد المعالجة" */
export default async function PaymentStatusPage({
  params,
}: PageProps<"/[locale]/checkout/[orderId]/status">) {
  const { locale: rawLocale, orderId } = await params;
  const locale = rawLocale as Locale;
  const user = await requireUser(locale, `/${locale}/checkout/${orderId}/status`);
  const order = await getMyOrder(orderId, user.userId);
  const view = viewFor(order);
  if (dedicated[view]) redirect(`/${locale}/checkout/${order.id}/${dedicated[view]}`);
  return <PaymentStatusView order={order} view={view} />;
}
