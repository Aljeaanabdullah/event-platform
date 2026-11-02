import { AlertTriangle, ExternalLink, ScanLine } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/account/section-card";
import { DeleteDraftButton, WithdrawButton } from "@/components/organizer/event-status-actions";
import { EventWizard } from "@/components/organizer/event-wizard";
import { EventStatusBadge, StatCard } from "@/components/organizer/status-badge";
import { Button } from "@/components/ui/button";
import { canManage, getEventForOrganizer, getOrganizerEventSales } from "@/features/organizer/queries";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireUser } from "@/lib/auth/session";
import { formatMoney } from "@/lib/money";
import { Banknote, Percent, Ticket, UserCheck, Wallet } from "lucide-react";

export const metadata: Metadata = { robots: { index: false } };

/**
 * فعالية واحدة للمنظّم:
 * - مسودة/مرفوضة: معالج التعديل (+ سبب الرفض) وحذف المسودة.
 * - قيد المراجعة: عرض فقط + سحب الطلب.
 * - منشورة: المبيعات الفعلية ورابط الصفحة العامة. (التعديل بعد النشر يحتاج مراجعة جديدة — Phase لاحقة)
 */
export default async function OrganizerEventPage({ params }: PageProps<"/[locale]/organizer/events/[id]">) {
  const { locale: rawLocale, id } = await params;
  const locale = rawLocale as Locale;
  const user = await requireUser(locale, `/${locale}/organizer/events/${id}`);
  const event = await getEventForOrganizer(id);
  const membership = user.memberships.find((m) => m.organizerId === event.organizerId);
  // RLS سمح بالقراءة (عضو أو مدير)، لكن الإدارة هنا لـ owner/manager فقط
  if (!membership || !canManage(membership)) notFound();

  const [t, format, sales] = await Promise.all([
    getTranslations("OrganizerEvents"),
    getFormatter(),
    getOrganizerEventSales(event.organizerId),
  ]);
  const orgName = locale === "ar" ? membership.nameAr : membership.nameEn;
  const title = locale === "ar" ? event.values.titleAr : event.values.titleEn;
  const editable = event.status === "draft" || event.status === "rejected";
  const row = sales.find((s) => s.event_id === event.id);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader title={title} subtitle={orgName}>
        <div className="flex flex-wrap items-center gap-2">
          <EventStatusBadge status={event.status} />
          {event.status === "published" ? (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href={`/events/${event.slug}`}>
                  <ExternalLink aria-hidden />
                  {t("publicPage")}
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`/organizer/check-in?org=${event.organizerId}&event=${event.id}`}>
                  <ScanLine aria-hidden />
                  {t("checkIn")}
                </Link>
              </Button>
            </>
          ) : null}
          {event.status === "pending_review" ? <WithdrawButton eventId={event.id} /> : null}
          {event.status === "draft" ? <DeleteDraftButton eventId={event.id} /> : null}
        </div>
      </PageHeader>

      {event.status === "rejected" && event.rejectionReason ? (
        <div
          role="alert"
          className="mb-6 flex gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4"
        >
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
          <div>
            <p className="font-semibold">{t("rejectedTitle")}</p>
            <p className="mt-1 text-sm" data-testid="rejection-reason">
              {event.rejectionReason}
            </p>
          </div>
        </div>
      ) : null}

      {editable ? (
        <EventWizard
          eventId={event.id}
          initialValues={event.values}
          lockedTicketIds={event.lockedTicketIds}
          organizerName={orgName}
        />
      ) : (
        <>
          <p className="mb-6 text-muted-foreground">
            {event.status === "pending_review" ? t("pendingBody") : t("lockedBody")}
          </p>
          {row ? (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5" data-testid="event-sales">
              <StatCard
                label={t("col.sold")}
                value={`${format.number(row.tickets_sold)} / ${format.number(row.capacity)}`}
                icon={Ticket}
                hint={row.tickets_reserved ? t("reserved", { count: row.tickets_reserved }) : undefined}
              />
              <StatCard label={t("checkedIn")} value={format.number(row.checked_in)} icon={UserCheck} />
              <StatCard
                label={t("col.gross")}
                value={formatMoney(Number(row.gross_fils), locale)}
                icon={Banknote}
              />
              <StatCard
                label={t("commission")}
                value={formatMoney(Number(row.commission_fils), locale)}
                icon={Percent}
              />
              <StatCard
                label={t("col.net")}
                value={formatMoney(Number(row.net_fils), locale)}
                icon={Wallet}
              />
            </ul>
          ) : null}
        </>
      )}
    </div>
  );
}
