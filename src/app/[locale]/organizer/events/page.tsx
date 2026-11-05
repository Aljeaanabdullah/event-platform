import { CalendarPlus, ClipboardList, Pencil } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/account/section-card";
import { EventStatusBadge } from "@/components/organizer/status-badge";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { getOrganizerEventSales, pickOrganizer } from "@/features/organizer/queries";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireUser } from "@/lib/auth/session";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { robots: { index: false } };

/** فعاليات الجهة ومبيعات كل منها — المنظّم يرى فعاليات جهته فقط */
export default async function OrganizerEventsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/organizer/events">) {
  const locale = (await params).locale as Locale;
  const { org } = await searchParams;
  const user = await requireUser(locale, `/${locale}/organizer/events`);
  const current = pickOrganizer(user, org);
  if (!current) notFound();

  const [t, format, rows] = await Promise.all([
    getTranslations("OrganizerEvents"),
    getFormatter(),
    getOrganizerEventSales(current.organizerId),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader title={t("title")} subtitle={locale === "ar" ? current.nameAr : current.nameEn}>
        <Button asChild className="rounded-xl bg-gradient-neon font-semibold text-white">
          <Link href={`/organizer/events/new?org=${current.organizerId}`}>
            <CalendarPlus aria-hidden />
            {t("new")}
          </Link>
        </Button>
      </PageHeader>

      {rows.length === 0 ? (
        <EmptyState icon={ClipboardList} title={t("emptyTitle")} description={t("emptyBody")} />
      ) : (
        <div className="glass overflow-x-auto rounded-3xl">
          <table className="w-full min-w-[720px] text-sm" data-testid="organizer-events-table">
            <thead className="text-start text-xs text-muted-foreground">
              <tr className="border-b">
                <th scope="col" className="p-4 text-start font-medium">
                  {t("col.event")}
                </th>
                <th scope="col" className="p-4 text-start font-medium">
                  {t("col.status")}
                </th>
                <th scope="col" className="p-4 text-start font-medium">
                  {t("col.sold")}
                </th>
                <th scope="col" className="p-4 text-start font-medium">
                  {t("col.gross")}
                </th>
                <th scope="col" className="p-4 text-start font-medium">
                  {t("col.net")}
                </th>
                <th scope="col" className="p-4 text-start font-medium">
                  <span className="sr-only">{t("col.actions")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.event_id} className="border-b last:border-0">
                  <td className="p-4">
                    <p className="font-semibold">{locale === "ar" ? e.title_ar : e.title_en}</p>
                    <p className="text-xs text-muted-foreground">
                      {format.dateTime(new Date(e.starts_at), "eventDateTime")}
                    </p>
                  </td>
                  <td className="p-4">
                    <EventStatusBadge status={e.status} />
                  </td>
                  <td className="p-4 tabular-nums">
                    {format.number(e.tickets_sold)} / {format.number(e.capacity)}
                  </td>
                  <td className="p-4 tabular-nums">{formatMoney(Number(e.gross_fils), locale)}</td>
                  <td className="p-4 tabular-nums">{formatMoney(Number(e.net_fils), locale)}</td>
                  <td className="p-4 text-end">
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/organizer/events/${e.event_id}`}>
                        <Pencil aria-hidden />
                        {e.status === "draft" || e.status === "rejected" ? t("edit") : t("view")}
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
