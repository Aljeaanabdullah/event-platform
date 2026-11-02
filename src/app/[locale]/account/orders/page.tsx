import { Receipt } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/account/section-card";
import { OrderStatusBadge } from "@/components/booking/order-summary";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { listMyOrders } from "@/features/booking/queries";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireUser } from "@/lib/auth/session";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { robots: { index: false } };

export default async function OrdersPage({ params }: PageProps<"/[locale]/account/orders">) {
  const locale = (await params).locale as Locale;
  const user = await requireUser(locale, `/${locale}/account/orders`);
  const [t, format, orders] = await Promise.all([
    getTranslations("Orders"),
    getFormatter(),
    listMyOrders(user.userId),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      {orders.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={t("emptyTitle")}
          description={t("emptyBody")}
          action={
            <Button asChild>
              <Link href="/events">{t("browse")}</Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3" data-testid="orders-list">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={o.status === "pending_payment" ? `/checkout/${o.id}` : `/account/orders/${o.id}`}
                className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 transition-colors hover:border-primary/40"
              >
                <div className="min-w-0">
                  <p className="font-semibold">{locale === "ar" ? o.events?.title_ar : o.events?.title_en}</p>
                  <p className="text-xs text-muted-foreground">
                    <span dir="ltr" className="font-mono">
                      {o.order_number}
                    </span>{" "}
                    · {format.dateTime(new Date(o.created_at), "eventDateTime")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold tabular-nums" dir="auto">
                    {formatMoney(Number(o.total_fils), locale)}
                  </span>
                  <OrderStatusBadge status={o.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
