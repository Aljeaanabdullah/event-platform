import { CalendarClock, History } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/account/section-card";
import { ReviewActions } from "@/components/admin/review-actions";
import { EventStatusBadge } from "@/components/organizer/status-badge";
import { EmptyState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listEventsForReview, recentReviewAudit } from "@/features/admin/queries";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireAdmin } from "@/lib/auth/session";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const tabs = ["pending_review", "rejected", "published"] as const;

/** مراجعة الفعاليات — للمدير فقط (غيره يحصل على 404). كل قرار يُسجَّل في audit_logs. */
export default async function AdminEventsPage({ params, searchParams }: PageProps<"/[locale]/admin/events">) {
  const locale = (await params).locale as Locale;
  await requireAdmin(locale, `/${locale}/admin/events`);
  const { status } = await searchParams;
  const current = tabs.find((s) => s === status) ?? "pending_review";

  const [t, tStatus, format, events, audit] = await Promise.all([
    getTranslations("AdminReview"),
    getTranslations("EventStatus"),
    getFormatter(),
    listEventsForReview(current),
    recentReviewAudit(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader title={t("eventsTitle")} subtitle={t("eventsSubtitle")} />

      <nav aria-label={t("filterLabel")} className="mb-6 flex flex-wrap gap-2">
        {tabs.map((s) => (
          <Button
            key={s}
            asChild
            size="sm"
            variant={s === current ? "default" : "outline"}
            className="rounded-full"
          >
            <Link href={`/admin/events?status=${s}`} aria-current={s === current ? "page" : undefined}>
              {tStatus(s)}
            </Link>
          </Button>
        ))}
      </nav>

      {events.length === 0 ? (
        <EmptyState icon={CalendarClock} title={t("emptyTitle")} description={t("emptyBody")} />
      ) : (
        <ul className="grid gap-4" data-testid="review-list">
          {events.map((e) => (
            <li key={e.id} className="glass grid gap-4 rounded-3xl p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold">{locale === "ar" ? e.title_ar : e.title_en}</h2>
                  <p className="text-sm text-muted-foreground">
                    {(locale === "ar" ? e.organizers?.name_ar : e.organizers?.name_en) ?? "—"} ·{" "}
                    {format.dateTime(new Date(e.starts_at), "eventDateTime")}
                  </p>
                </div>
                <div className="flex gap-2">
                  {e.organizers?.is_test ? <Badge variant="outline">{t("testData")}</Badge> : null}
                  <EventStatusBadge status={e.status} />
                </div>
              </div>
              <details className="text-sm">
                <summary className="cursor-pointer font-medium text-primary">{t("details")}</summary>
                <div className="mt-3 grid gap-2 text-muted-foreground">
                  <p>{locale === "ar" ? e.summary_ar : e.summary_en}</p>
                  <p className="whitespace-pre-line">
                    {locale === "ar" ? e.description_ar : e.description_en}
                  </p>
                  <p>
                    {e.is_online
                      ? t("online")
                      : ((locale === "ar" ? e.venue_name_ar : e.venue_name_en) ?? "—")}
                  </p>
                  <ul className="list-disc ps-5">
                    {e.ticket_types.map((tt, i) => (
                      <li key={i}>
                        {locale === "ar" ? tt.name_ar : tt.name_en} —{" "}
                        {formatMoney(Number(tt.price_fils), locale)} × {format.number(tt.quantity_total)}
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
              {e.status === "rejected" && e.rejection_reason ? (
                <p className="text-sm text-destructive">{t("reasonShown", { reason: e.rejection_reason })}</p>
              ) : null}
              {e.status === "pending_review" ? <ReviewActions kind="event" id={e.id} /> : null}
            </li>
          ))}
        </ul>
      )}

      <section aria-labelledby="audit-title" className="mt-12">
        <h2 id="audit-title" className="mb-4 flex items-center gap-2 text-xl font-bold">
          <History className="size-5 text-primary" aria-hidden />
          {t("auditTitle")}
        </h2>
        {audit.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("auditEmpty")}</p>
        ) : (
          <ul className="grid gap-2 text-sm">
            {audit.map((a) => (
              <li key={a.id} className="flex flex-wrap justify-between gap-2 rounded-xl border px-4 py-2">
                <span dir="ltr" className="font-mono text-xs">
                  {a.action} · {a.entity_id?.slice(0, 8)} →{" "}
                  {(a.after as { status?: string } | null)?.status ?? "—"}
                </span>
                <time className="text-muted-foreground" dateTime={a.created_at}>
                  {format.dateTime(new Date(a.created_at), "eventDateTime")}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
