import { ScanLine } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/account/section-card";
import { Scanner } from "@/components/checkin/scanner";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireUser } from "@/lib/auth/session";
import { nowMs } from "@/lib/kuwait-time";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * صفحة التحقق عند البوابة — لأعضاء الجهة المعتمدة (owner/manager/scanner).
 * اختيار الفعالية يمنع قبول تذكرة فعالية أخرى (wrong_event)، والتحقق الفعلي في قاعدة البيانات.
 */
export default async function CheckInPage({
  params,
  searchParams,
}: PageProps<"/[locale]/organizer/check-in">) {
  const locale = (await params).locale as Locale;
  const { event: eventParam } = await searchParams;
  const user = await requireUser(locale, `/${locale}/organizer/check-in`);
  const orgIds = user.memberships.filter((m) => m.status === "approved").map((m) => m.organizerId);
  if (orgIds.length === 0) notFound();

  const [t, format] = await Promise.all([getTranslations("CheckIn"), getFormatter()]);
  const supabase = await createClient();
  const since = new Date(nowMs() - 24 * 3600 * 1000).toISOString();
  const { data: events } = await supabase
    .from("events")
    .select("id, title_ar, title_en, starts_at")
    .in("organizer_id", orgIds)
    .eq("status", "published")
    .gte("ends_at", since)
    .order("starts_at")
    .limit(30);

  const selected = (events ?? []).find((e) => e.id === eventParam) ?? null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      {!events?.length ? (
        <EmptyState icon={ScanLine} title={t("noEvents")} description={t("noEventsBody")} />
      ) : (
        <>
          <nav
            aria-label={t("chooseEvent")}
            className="mb-6 flex flex-wrap gap-2"
            data-testid="checkin-events"
          >
            {events.map((e) => (
              <Button
                key={e.id}
                asChild
                size="sm"
                variant={selected?.id === e.id ? "default" : "outline"}
                className="rounded-full"
              >
                <Link
                  href={`/organizer/check-in?event=${e.id}`}
                  aria-current={selected?.id === e.id ? "page" : undefined}
                >
                  {locale === "ar" ? e.title_ar : e.title_en} ·{" "}
                  {format.dateTime(new Date(e.starts_at), { day: "numeric", month: "short" })}
                </Link>
              </Button>
            ))}
          </nav>
          {selected ? (
            <Scanner eventId={selected.id} />
          ) : (
            <p className="text-muted-foreground">{t("selectFirst")}</p>
          )}
        </>
      )}
    </div>
  );
}
