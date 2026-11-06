import { CreditCard } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/account/section-card";
import { PaymentsLive } from "@/components/admin/payments-live";
import { EmptyState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { paymentState, type PaymentState } from "@/features/admin/payment-state";
import { listOrdersWithPayments } from "@/features/admin/queries";
import type { Locale } from "@/i18n/routing";
import { requireAdmin } from "@/lib/auth/session";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// ألوان أغمق في الوضع الفاتح وأفتح في الداكن لتحقيق تباين WCAG AA
const stateStyle: Record<PaymentState, string> = {
  pending: "bg-muted text-muted-foreground",
  awaiting_payment: "bg-blue-500/15 text-blue-800 border-blue-500/30 dark:text-blue-300",
  paid: "bg-emerald-500/15 text-emerald-800 border-emerald-500/30 dark:text-emerald-300",
  failed: "bg-red-500/15 text-red-800 border-red-500/30 dark:text-red-300",
  expired: "bg-orange-500/15 text-orange-800 border-orange-500/30 dark:text-orange-300",
  cancelled: "bg-muted text-muted-foreground line-through",
  refund: "bg-purple-500/15 text-purple-800 border-purple-500/30 dark:text-purple-300",
};

/** حالة مدفوعات الطلبات — للمدير فقط (غيره يحصل على 404)، وتتحدث مباشرة عبر Realtime */
export default async function AdminPaymentsPage({ params }: PageProps<"/[locale]/admin/payments">) {
  const locale = (await params).locale as Locale;
  await requireAdmin(locale, `/${locale}/admin/payments`);
  const [t, format, orders] = await Promise.all([
    getTranslations("AdminPayments"),
    getFormatter(),
    listOrdersWithPayments(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <PaymentsLive />
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      {orders.length === 0 ? (
        <EmptyState icon={CreditCard} title={t("emptyTitle")} description={t("emptyBody")} />
      ) : (
        <ul className="grid gap-3" data-testid="admin-payments">
          {orders.map((order) => {
            const state = paymentState(order.status, order.payments);
            const reason = [...order.payments]
              .sort((a, b) => b.created_at.localeCompare(a.created_at))
              .at(0)?.failure_reason;
            return (
              <li
                key={order.id}
                className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4"
                data-testid="admin-payment-row"
                data-order={order.order_number}
              >
                <div className="min-w-0">
                  <p className="font-semibold" dir="ltr">
                    {order.order_number}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {(locale === "ar" ? order.events?.title_ar : order.events?.title_en) ?? "—"} ·{" "}
                    {format.dateTime(new Date(order.created_at), "eventDateTime")}
                  </p>
                  {state === "failed" && reason ? (
                    <p className="text-sm text-red-800 dark:text-red-300">{t("reason", { reason })}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold tabular-nums" dir="auto">
                    {formatMoney(Number(order.total_fils), locale)}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(stateStyle[state])}
                    data-testid="payment-state"
                    data-state={state}
                  >
                    {t(`states.${state}`)}
                  </Badge>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
