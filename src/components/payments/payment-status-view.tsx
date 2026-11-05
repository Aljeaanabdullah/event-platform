import { Ban, CheckCircle2, Clock, RotateCcw, Ticket, XCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { OrderSummary } from "@/components/booking/order-summary";
import { Button } from "@/components/ui/button";
import type { MyOrder } from "@/features/booking/queries";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import { AutoRefresh } from "./auto-refresh";

export type PaymentView = "success" | "failed" | "cancelled" | "processing" | "expired" | "refund";

/**
 * الحالة تُستنتج من قاعدة البيانات فقط (حالة الطلب وآخر دفعة) — وليس من رابط العودة.
 */
export function viewFor(order: MyOrder): PaymentView {
  if (order.status === "paid") return "success";
  if (order.status === "needs_refund" || order.status === "refunded") return "refund";
  if (order.status === "expired" || order.status === "cancelled") return "expired";
  const latest = [...order.payments].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  if (latest?.status === "failed") return "failed";
  if (latest?.status === "cancelled") return "cancelled";
  return "processing";
}

const style: Record<PaymentView, { Icon: typeof CheckCircle2; cls: string }> = {
  success: { Icon: CheckCircle2, cls: "text-emerald-600 dark:text-emerald-300" },
  failed: { Icon: XCircle, cls: "text-red-600 dark:text-red-300" },
  cancelled: { Icon: Ban, cls: "text-amber-700 dark:text-amber-300" },
  processing: { Icon: Clock, cls: "text-sky-700 dark:text-sky-300" },
  expired: { Icon: Clock, cls: "text-muted-foreground" },
  refund: { Icon: RotateCcw, cls: "text-amber-700 dark:text-amber-300" },
};

export async function PaymentStatusView({ order, view }: { order: MyOrder; view: PaymentView }) {
  const t = await getTranslations("Payment.status");
  const { Icon, cls } = style[view];
  return (
    <div
      className="mx-auto grid max-w-3xl gap-6 px-4 py-10 sm:px-6"
      data-testid="payment-status"
      data-view={view}
    >
      <div className="glass grid justify-items-center gap-3 rounded-3xl p-8 text-center">
        <Icon className={cn("size-14", cls)} aria-hidden />
        <h1 className="text-2xl font-extrabold">{t(`${view}.title`)}</h1>
        <p className="max-w-md text-muted-foreground">{t(`${view}.body`)}</p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {view === "success" ? (
            <Button asChild className="rounded-xl bg-gradient-neon font-semibold text-white">
              <Link href={`/account/orders/${order.id}`}>
                <Ticket aria-hidden />
                {t("viewTickets")}
              </Link>
            </Button>
          ) : null}
          {(view === "failed" || view === "cancelled") && order.status === "pending_payment" ? (
            <Button asChild className="rounded-xl">
              <Link href={`/checkout/${order.id}`}>{t("tryAgain")}</Link>
            </Button>
          ) : null}
          {view === "expired" && order.events ? (
            <Button asChild variant="outline" className="rounded-xl">
              <Link href={`/events/${order.events.slug}`}>{t("backToEvent")}</Link>
            </Button>
          ) : null}
        </div>
      </div>
      {view === "processing" ? <AutoRefresh seconds={4} /> : null}
      <OrderSummary order={order} />
    </div>
  );
}
