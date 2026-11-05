import { CheckCircle2, Ticket } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/account/section-card";
import { FormAlert } from "@/components/auth/form-alert";
import { OrderSummary } from "@/components/booking/order-summary";
import { Button } from "@/components/ui/button";
import { getMyOrder } from "@/features/booking/queries";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { robots: { index: false } };

/** تفاصيل الطلب (رابط الإشعار بعد التأكيد) — للمشتري فقط */
export default async function OrderPage({
  params,
  searchParams,
}: PageProps<"/[locale]/account/orders/[id]">) {
  const { locale: rawLocale, id } = await params;
  const locale = rawLocale as Locale;
  const { booked } = await searchParams;
  const user = await requireUser(locale, `/${locale}/account/orders/${id}`);
  const order = await getMyOrder(id, user.userId);
  const t = await getTranslations("Orders");

  const supabase = await createClient();
  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, code, status")
    .eq("order_id", order.id)
    .eq("owner_user_id", user.userId)
    .order("created_at");

  return (
    <div className="mx-auto grid max-w-3xl gap-6 px-4 py-10 sm:px-6">
      <PageHeader title={t("detailTitle")} />
      {booked && order.status === "paid" ? (
        <FormAlert variant="success">
          <span className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="size-4" aria-hidden />
            {t("confirmed")}
          </span>
        </FormAlert>
      ) : null}
      {order.status === "needs_refund" ? <FormAlert>{t("needsRefund")}</FormAlert> : null}
      <OrderSummary order={order} />
      {tickets?.length ? (
        <section aria-labelledby="tickets-title" className="grid gap-3">
          <h2 id="tickets-title" className="text-lg font-bold">
            {t("ticketsTitle", { count: tickets.length })}
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2" data-testid="order-tickets">
            {tickets.map((tk) => (
              <li key={tk.id}>
                <Button
                  asChild
                  variant="outline"
                  className="glass h-auto w-full justify-between rounded-2xl p-4"
                >
                  <Link href={`/account/tickets/${tk.id}`}>
                    <span className="flex items-center gap-2">
                      <Ticket className="size-4 text-primary" aria-hidden />
                      <span dir="ltr" className="font-mono">
                        {tk.code}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">{t("showQr")}</span>
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
