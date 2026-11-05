import {
  Banknote,
  Briefcase,
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  ClipboardList,
  Hourglass,
  Percent,
  Plus,
  ScanLine,
  ShoppingBag,
  Ticket,
  Wallet,
} from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/account/section-card";
import { LogoUploader } from "@/components/organizer/logo-uploader";
import { EventStatusBadge, StatCard } from "@/components/organizer/status-badge";
import { EmptyState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getOrganizerDashboard, getOrganizerEventSales, pickOrganizer } from "@/features/organizer/queries";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireUser } from "@/lib/auth/session";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/[locale]/organizer">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "Organizer" });
  return { title: t("title"), robots: { index: false } };
}

const statusStyle = {
  pending: "bg-warning/15 text-warning border-warning/30",
  approved: "bg-success/15 text-success border-success/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  suspended: "bg-muted text-muted-foreground",
} as const;

/**
 * لوحة المنظّم: أرقام فعلية من قاعدة البيانات (get_organizer_dashboard ترفض غير الأعضاء)،
 * الفعاليات القادمة، واختصارات. لمن ليس منظّمًا معتمدًا: حالة طلباته.
 */
export default async function OrganizerPage({ params, searchParams }: PageProps<"/[locale]/organizer">) {
  const locale = (await params).locale as Locale;
  const { org } = await searchParams;
  const user = await requireUser(locale, `/${locale}/organizer`);
  const [t, tDash, format] = await Promise.all([
    getTranslations("Organizer"),
    getTranslations("OrganizerDashboard"),
    getFormatter(),
  ]);

  const current = pickOrganizer(user, org);

  if (!current) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <PageHeader title={t("title")} subtitle={t("subtitle")} />
        {user.memberships.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title={t("emptyTitle")}
            description={t("emptyBody")}
            action={
              <Button asChild>
                <Link href="/organizer/apply">{t("apply")}</Link>
              </Button>
            }
          />
        ) : (
          <ul className="grid gap-4" data-testid="organizer-memberships">
            {user.memberships.map((m) => (
              <li key={m.organizerId} className="glass rounded-2xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="text-lg font-semibold">{locale === "ar" ? m.nameAr : m.nameEn}</p>
                  <div className="flex gap-2">
                    <Badge variant="outline">{t(`memberRole.${m.role}`)}</Badge>
                    <Badge variant="outline" className={cn(statusStyle[m.status])}>
                      {t(`status.${m.status}`)}
                    </Badge>
                  </div>
                </div>
                {m.status === "rejected" && m.rejectionReason ? (
                  <p className="mt-3 text-sm text-destructive">
                    {t("rejectionReason", { reason: m.rejectionReason })}
                  </p>
                ) : null}
                {m.status === "approved" && m.role === "scanner" ? (
                  <Button asChild variant="outline" className="mt-3">
                    <Link href="/organizer/check-in">
                      <ScanLine aria-hidden />
                      {tDash("checkIn")}
                    </Link>
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const [stats, sales] = await Promise.all([
    getOrganizerDashboard(current.organizerId),
    getOrganizerEventSales(current.organizerId),
  ]);
  const orgName = locale === "ar" ? current.nameAr : current.nameEn;
  const money = (fils: number) => formatMoney(Number(fils), locale);
  const upcoming = sales
    .filter((e) => e.status === "published" && new Date(e.starts_at) > new Date())
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .slice(0, 5);
  const managed = user.memberships.filter((m) => m.status === "approved" && m.role !== "scanner");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8" data-testid="organizer-dashboard">
      <PageHeader title={tDash("title", { name: orgName })} subtitle={tDash("subtitle")}>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="rounded-xl bg-gradient-neon font-semibold text-white glow-primary">
            <Link href={`/organizer/events/new?org=${current.organizerId}`}>
              <CalendarPlus aria-hidden />
              {tDash("newEvent")}
            </Link>
          </Button>
          <Button asChild variant="outline" className="glass rounded-xl">
            <Link href={`/organizer/events?org=${current.organizerId}`}>
              <ClipboardList aria-hidden />
              {tDash("manageEvents")}
            </Link>
          </Button>
          <Button asChild variant="outline" className="glass rounded-xl">
            <Link href={`/organizer/check-in?org=${current.organizerId}`}>
              <ScanLine aria-hidden />
              {tDash("checkIn")}
            </Link>
          </Button>
        </div>
      </PageHeader>

      {managed.length > 1 ? (
        <nav aria-label={tDash("switchOrg")} className="mb-6 flex flex-wrap gap-2">
          {managed.map((m) => (
            <Button
              key={m.organizerId}
              asChild
              size="sm"
              variant={m.organizerId === current.organizerId ? "default" : "outline"}
              className="rounded-full"
            >
              <Link
                href={`/organizer?org=${m.organizerId}`}
                aria-current={m.organizerId === current.organizerId ? "page" : undefined}
              >
                {locale === "ar" ? m.nameAr : m.nameEn}
              </Link>
            </Button>
          ))}
        </nav>
      ) : null}

      <LogoUploader
        key={current.organizerId}
        organizerId={current.organizerId}
        logoPath={current.logoPath}
        orgName={orgName}
      />

      {stats ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="organizer-stats">
          <StatCard
            label={tDash("stats.eventsTotal")}
            value={format.number(stats.events_total)}
            icon={CalendarCheck}
          />
          <StatCard
            label={tDash("stats.published")}
            value={format.number(stats.events_published)}
            icon={Ticket}
          />
          <StatCard
            label={tDash("stats.pending")}
            value={format.number(stats.events_pending)}
            icon={Hourglass}
          />
          <StatCard
            label={tDash("stats.bookings")}
            value={format.number(stats.orders_paid)}
            icon={ShoppingBag}
          />
          <StatCard
            label={tDash("stats.ticketsSold")}
            value={format.number(stats.tickets_sold)}
            icon={Ticket}
          />
          <StatCard label={tDash("stats.gross")} value={money(stats.gross_fils)} icon={Banknote} />
          <StatCard
            label={tDash("stats.commission")}
            value={money(stats.commission_fils)}
            icon={Percent}
            hint={tDash("stats.commissionHint")}
          />
          <StatCard
            label={tDash("stats.net")}
            value={money(stats.net_fils)}
            icon={Wallet}
            hint={tDash("stats.netHint")}
          />
        </ul>
      ) : (
        <p className="text-destructive">{tDash("loadError")}</p>
      )}

      <section aria-labelledby="upcoming-title" className="mt-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="upcoming-title" className="flex items-center gap-2 text-xl font-bold">
            <CalendarClock className="size-5 text-primary" aria-hidden />
            {tDash("upcoming")}
          </h2>
        </div>
        {upcoming.length === 0 ? (
          <EmptyState
            icon={CalendarPlus}
            title={tDash("noUpcoming")}
            description={tDash("noUpcomingBody")}
            action={
              <Button asChild>
                <Link href={`/organizer/events/new?org=${current.organizerId}`}>
                  <Plus aria-hidden />
                  {tDash("newEvent")}
                </Link>
              </Button>
            }
          />
        ) : (
          <ul className="grid gap-3">
            {upcoming.map((e) => (
              <li
                key={e.event_id}
                className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4"
              >
                <div className="min-w-0">
                  <Link href={`/organizer/events/${e.event_id}`} className="font-semibold hover:underline">
                    {locale === "ar" ? e.title_ar : e.title_en}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {format.dateTime(new Date(e.starts_at), "eventDateTime")}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="tabular-nums">
                    {tDash("soldOf", { sold: e.tickets_sold, total: e.capacity })}
                  </span>
                  <EventStatusBadge status={e.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
