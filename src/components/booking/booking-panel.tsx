"use client";

import { Loader2, Minus, Plus, Ticket } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import { reserveTickets } from "@/features/booking/actions";
import type { ReserveError } from "@/features/booking/schema";
import type { EventAvailability, PublicTicketType } from "@/features/events/types";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

const stateStyle = {
  on_sale: "text-emerald-700 dark:text-emerald-300",
  sold_out: "text-red-700 dark:text-red-300",
  not_started: "text-amber-800 dark:text-amber-300",
  ended: "text-muted-foreground",
} as const;

/**
 * اختيار التذاكر والحجز. الإجمالي المعروض هنا للعرض فقط —
 * المبلغ الفعلي يُحسب بالفلس داخل قاعدة البيانات (reserve_tickets) ويظهر في صفحة الدفع.
 */
export function BookingPanel({
  eventId,
  ticketTypes,
  availability,
}: {
  eventId: string;
  eventSlug: string;
  ticketTypes: PublicTicketType[];
  availability: EventAvailability;
}) {
  const t = useTranslations("EventDetails");
  const tBook = useTranslations("Booking");
  const tCard = useTranslations("EventCard");
  const format = useFormatter();
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [error, setError] = useState<ReserveError | null>(null);
  const [pending, start] = useTransition();

  if (ticketTypes.length === 0) {
    return <p className="mt-4 text-sm text-muted-foreground">{t("noTickets")}</p>;
  }

  const bookable = availability === "available";
  const items = Object.entries(qty)
    .filter(([, n]) => n > 0)
    .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }));
  const estimate = items.reduce(
    (sum, i) => sum + (ticketTypes.find((tt) => tt.id === i.ticketTypeId)?.priceFils ?? 0) * i.quantity,
    0,
  );

  function change(tt: PublicTicketType, delta: number) {
    setError(null);
    setQty((q) => {
      const max = Math.min(tt.maxPerOrder, tt.available);
      const next = Math.max(0, Math.min(max, (q[tt.id] ?? 0) + delta));
      return { ...q, [tt.id]: next };
    });
  }

  function book() {
    // الخادم هو مرجع الجلسة: حالة الجلسة في المتصفح قد تكون "loading" لحظة تحميل الصفحة
    start(async () => {
      const res = await reserveTickets({ eventId, items }, locale);
      if (!res.ok) {
        if (res.error === "authRequired") {
          router.push(`/login?next=${encodeURIComponent(`/${locale}${pathname}`)}`);
          return;
        }
        setError(res.error);
        if (res.error === "soldOut") router.refresh();
        return;
      }
      router.push(
        res.status === "paid" ? `/account/orders/${res.orderId}?booked=1` : `/checkout/${res.orderId}`,
      );
    });
  }

  return (
    <div className="mt-4 grid gap-3">
      <ul className="grid gap-3" data-testid="ticket-types">
        {ticketTypes.map((tt) => {
          const n = qty[tt.id] ?? 0;
          const canBuy = bookable && tt.state === "on_sale";
          return (
            <li key={tt.id} className="rounded-2xl border bg-background/50 p-4" data-testid="ticket-type">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{tt.name}</p>
                  {tt.description ? (
                    <p className="mt-0.5 text-sm text-muted-foreground">{tt.description}</p>
                  ) : null}
                </div>
                <p className="shrink-0 text-lg font-bold tabular-nums" dir="auto">
                  {tt.priceFils === 0 ? tCard("free") : formatMoney(tt.priceFils, locale)}
                </p>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className={cn("text-sm font-medium", stateStyle[tt.state])}>
                  {tt.state === "on_sale"
                    ? t("seatsLeft", { count: tt.available })
                    : tt.state === "not_started" && tt.salesStartAt
                      ? t("salesStart", { date: format.dateTime(new Date(tt.salesStartAt), "eventDateTime") })
                      : t(`ticketState.${tt.state}`)}
                </p>
                {canBuy ? (
                  <div
                    className="flex items-center gap-1"
                    role="group"
                    aria-label={tBook("quantityFor", { name: tt.name })}
                  >
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="size-8 rounded-full"
                      onClick={() => change(tt, -1)}
                      disabled={n === 0 || pending}
                      aria-label={tBook("decrease", { name: tt.name })}
                    >
                      <Minus className="size-4" aria-hidden />
                    </Button>
                    <output
                      className="w-8 text-center font-bold tabular-nums"
                      aria-live="polite"
                      data-testid="ticket-qty"
                    >
                      {n}
                    </output>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="size-8 rounded-full"
                      onClick={() => change(tt, 1)}
                      disabled={n >= Math.min(tt.maxPerOrder, tt.available) || pending}
                      aria-label={tBook("increase", { name: tt.name })}
                    >
                      <Plus className="size-4" aria-hidden />
                    </Button>
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {availability === "cancelled" || availability === "ended" ? (
        <p className="text-sm text-muted-foreground">{tCard(`status.${availability}`)}</p>
      ) : null}

      {bookable ? (
        <>
          <div className="flex items-center justify-between border-t pt-3 text-sm">
            <span className="text-muted-foreground">{tBook("estimate")}</span>
            <span className="text-lg font-bold tabular-nums" dir="auto" data-testid="booking-estimate">
              {estimate === 0 && items.length ? tCard("free") : formatMoney(estimate, locale)}
            </span>
          </div>
          {error ? <FormAlert>{tBook(`errors.${error}`)}</FormAlert> : null}
          <Button
            type="button"
            onClick={book}
            disabled={items.length === 0 || pending}
            className="h-12 rounded-xl bg-gradient-neon text-base font-bold text-white glow-primary"
            data-testid="book-button"
          >
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Ticket aria-hidden />}
            {pending ? tBook("reserving") : tBook("book")}
          </Button>
          <p className="text-xs text-muted-foreground">{tBook("holdNote")}</p>
        </>
      ) : null}
    </div>
  );
}
