import { Ticket } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/account/section-card";
import { TicketStatusBadge } from "@/components/booking/ticket-status-badge";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { listMyTickets } from "@/features/booking/queries";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireUser } from "@/lib/auth/session";
import { nowMs } from "@/lib/kuwait-time";

export const metadata: Metadata = { robots: { index: false } };

/** تذاكري — القادمة أولًا ثم السابقة */
export default async function MyTicketsPage({ params }: PageProps<"/[locale]/account/tickets">) {
  const locale = (await params).locale as Locale;
  const user = await requireUser(locale, `/${locale}/account/tickets`);
  const [t, format, tickets] = await Promise.all([
    getTranslations("Tickets"),
    getFormatter(),
    listMyTickets(user.userId),
  ]);
  const now = nowMs();
  const upcoming = tickets.filter((tk) => tk.events && new Date(tk.events.ends_at).getTime() > now);
  const past = tickets.filter((tk) => !tk.events || new Date(tk.events.ends_at).getTime() <= now);

  const list = (items: typeof tickets) => (
    <ul className="grid gap-3 sm:grid-cols-2" data-testid="tickets-list">
      {items.map((tk) => (
        <li key={tk.id}>
          <Link
            href={`/account/tickets/${tk.id}`}
            className="glass neon-border grid gap-2 rounded-2xl p-4 transition-shadow hover:shadow-[0_0_24px_-6px_var(--glow)]"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold">{locale === "ar" ? tk.events?.title_ar : tk.events?.title_en}</p>
              <TicketStatusBadge status={tk.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {tk.events ? format.dateTime(new Date(tk.events.starts_at), "eventDateTime") : null}
            </p>
            <p className="flex items-center justify-between text-sm">
              <span>{locale === "ar" ? tk.ticket_types?.name_ar : tk.ticket_types?.name_en}</span>
              <span dir="ltr" className="font-mono text-xs text-muted-foreground">
                {tk.code}
              </span>
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      {tickets.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title={t("emptyTitle")}
          description={t("emptyBody")}
          action={
            <Button asChild>
              <Link href="/events">{t("browse")}</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-8">
          {upcoming.length ? (
            <section aria-labelledby="upcoming-tickets" className="grid gap-3">
              <h2 id="upcoming-tickets" className="text-lg font-bold">
                {t("upcoming")}
              </h2>
              {list(upcoming)}
            </section>
          ) : null}
          {past.length ? (
            <section aria-labelledby="past-tickets" className="grid gap-3">
              <h2 id="past-tickets" className="text-lg font-bold">
                {t("past")}
              </h2>
              {list(past)}
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
