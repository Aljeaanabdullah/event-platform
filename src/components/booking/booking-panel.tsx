import { useFormatter, useLocale, useTranslations } from "next-intl";

import type { EventAvailability, PublicTicketType } from "@/features/events/types";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

const stateStyle = {
  on_sale: "text-success",
  sold_out: "text-destructive",
  not_started: "text-warning",
  ended: "text-muted-foreground",
} as const;

/** أنواع التذاكر وأسعارها وحالتها — كلها من قاعدة البيانات */
export function BookingPanel({
  ticketTypes,
  availability,
}: {
  eventId: string;
  eventSlug: string;
  ticketTypes: PublicTicketType[];
  availability: EventAvailability;
}) {
  const t = useTranslations("EventDetails");
  const tCard = useTranslations("EventCard");
  const format = useFormatter();
  const locale = useLocale();

  if (ticketTypes.length === 0) {
    return <p className="mt-4 text-sm text-muted-foreground">{t("noTickets")}</p>;
  }

  return (
    <ul className="mt-4 grid gap-3" data-testid="ticket-types">
      {ticketTypes.map((tt) => (
        <li key={tt.id} className="rounded-2xl border bg-background/50 p-4">
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
          <p className={cn("mt-2 text-sm font-medium", stateStyle[tt.state])}>
            {tt.state === "on_sale"
              ? t("seatsLeft", { count: tt.available })
              : tt.state === "not_started" && tt.salesStartAt
                ? t("salesStart", { date: format.dateTime(new Date(tt.salesStartAt), "eventDateTime") })
                : t(`ticketState.${tt.state}`)}
          </p>
        </li>
      ))}
      {availability === "cancelled" || availability === "ended" ? (
        <li className="text-sm text-muted-foreground">{tCard(`status.${availability}`)}</li>
      ) : null}
    </ul>
  );
}
