import { useFormatter, useLocale, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import type { MyOrder } from "@/features/booking/queries";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

const statusStyle: Record<string, string> = {
  paid: "bg-emerald-500/15 text-emerald-800 border-emerald-500/30 dark:text-emerald-300",
  pending_payment: "bg-amber-500/15 text-amber-800 border-amber-500/30 dark:text-amber-300",
  expired: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
  needs_refund: "bg-red-500/15 text-red-800 border-red-500/30 dark:text-red-300",
  refunded: "bg-muted text-muted-foreground",
  partially_refunded: "bg-muted text-muted-foreground",
};

export function OrderStatusBadge({ status }: { status: string }) {
  const t = useTranslations("Orders.status");
  return (
    <Badge variant="outline" className={cn(statusStyle[status])} data-testid="order-status">
      {t(status as "paid")}
    </Badge>
  );
}

/** ملخص الطلب — كل المبالغ من قاعدة البيانات (لقطة وقت الحجز في order_items) */
export function OrderSummary({ order }: { order: MyOrder }) {
  const t = useTranslations("Orders");
  const locale = useLocale();
  const format = useFormatter();
  const money = (fils: number) => formatMoney(Number(fils), locale);
  const event = order.events;

  return (
    <div className="glass grid gap-4 rounded-3xl p-5 sm:p-6" data-testid="order-summary">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{t("orderNumber")}</p>
          <p className="font-mono text-lg font-bold" dir="ltr">
            {order.order_number}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>
      {event ? (
        <div>
          <p className="font-semibold">{locale === "ar" ? event.title_ar : event.title_en}</p>
          <p className="text-sm text-muted-foreground">
            {format.dateTime(new Date(event.starts_at), "eventDateTime")}
          </p>
        </div>
      ) : null}
      <table className="w-full text-sm">
        <caption className="sr-only">{t("items")}</caption>
        <tbody>
          {order.order_items.map((i) => (
            <tr key={i.id} className="border-b last:border-0">
              <th scope="row" className="py-2 text-start font-medium">
                {locale === "ar" ? i.ticket_name_ar : i.ticket_name_en} × {i.quantity}
              </th>
              <td className="py-2 text-end tabular-nums" dir="auto">
                {money(i.line_total_fils)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="grid gap-1.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t("subtotal")}</dt>
          <dd className="tabular-nums" dir="auto">
            {money(order.subtotal_fils)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t("serviceFee")}</dt>
          <dd className="tabular-nums" dir="auto">
            {money(order.service_fee_fils)}
          </dd>
        </div>
        <div className="flex justify-between border-t pt-2 text-base font-bold">
          <dt>{t("total")}</dt>
          <dd className="tabular-nums" dir="auto" data-testid="order-total">
            {money(order.total_fils)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
