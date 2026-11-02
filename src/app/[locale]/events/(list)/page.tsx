import { ArrowLeft, ArrowRight, SearchX, X } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";

import { EventCard } from "@/components/events/event-card";
import { EventFilters } from "@/components/events/event-filters";
import { Reveal } from "@/components/motion/reveal";
import { TiltCard } from "@/components/motion/tilt-card";
import { EmptyState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { searchEvents } from "@/features/events/queries";
import { eventSearchHref, parseEventSearch } from "@/features/events/search-params";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/[locale]/events">): Promise<Metadata> {
  const { locale } = await params;
  const search = parseEventSearch(await searchParams);
  const t = await getTranslations({ locale: locale as Locale, namespace: "Events" });
  const filtered = Object.values(search).some((v) => v !== undefined);
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: { canonical: `/${locale}/events`, languages: { ar: "/ar/events", en: "/en/events" } },
    // نتائج البحث المُصفّاة لا تُفهرس (محتوى مكرر)، الصفحة الأساسية تُفهرس
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

/** صفحة الفعاليات: بحث وفلاتر وترتيب وترقيم — كلها من الرابط ومن قاعدة البيانات */
export default async function EventsPage({ params, searchParams }: PageProps<"/[locale]/events">) {
  const locale = (await params).locale as Locale;
  const search = parseEventSearch(await searchParams);
  const [result, t, tAreas, tCategories, tDates, tCard, format] = await Promise.all([
    searchEvents(search, locale),
    getTranslations("Events"),
    getTranslations("Areas"),
    getTranslations("Categories"),
    getTranslations("DatePresets"),
    getTranslations("EventCard"),
    getFormatter(),
  ]);

  const active = [
    search.q ? { key: "q", label: `“${search.q}”` } : null,
    search.category ? { key: "category", label: tCategories(search.category) } : null,
    search.area ? { key: "area", label: tAreas(search.area) } : null,
    search.date ? { key: "date", label: tDates(search.date) } : null,
    search.day
      ? {
          key: "day",
          label: format.dateTime(new Date(`${search.day}T12:00:00+03:00`), { dateStyle: "medium" }),
        }
      : null,
    search.price ? { key: "price", label: search.price === "free" ? tCard("free") : t("filter.paid") } : null,
  ].filter((v): v is { key: keyof typeof search; label: string } => v !== null);

  const { events, total, page, pageCount } = result;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Reveal>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
      </Reveal>

      <div className="mt-6">
        <EventFilters search={search} />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite" data-testid="results-count">
          {t("resultsCount", { count: total })}
        </p>
        {active.length > 0 ? (
          <div
            className="flex flex-wrap items-center gap-2"
            aria-label={t("activeFilters")}
            data-testid="active-filters"
          >
            {active.map((f) => (
              <Badge key={f.key} variant="secondary" className="gap-1 ps-2.5 pe-1">
                {f.label}
                <Link
                  href={eventSearchHref(search, { [f.key]: undefined, page: undefined })}
                  aria-label={t("removeFilter", { name: f.label })}
                  className="rounded-full p-0.5 hover:bg-foreground/10"
                >
                  <X className="size-3.5" aria-hidden />
                </Link>
              </Badge>
            ))}
            <Button asChild variant="ghost" size="sm">
              <Link href="/events">{t("clearFilters")}</Link>
            </Button>
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        {events.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title={active.length > 0 ? t("emptyTitle") : t("noEventsTitle")}
            description={active.length > 0 ? t("emptyDescription") : t("noEventsDescription")}
          />
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-testid="event-results">
            {events.map((event, i) => (
              <Reveal as="li" key={event.id} delay={Math.min(i, 5) * 0.04}>
                <TiltCard className="h-full">
                  <EventCard event={event} priority={i < 3} />
                </TiltCard>
              </Reveal>
            ))}
          </ul>
        )}
      </div>

      {pageCount > 1 ? (
        <nav aria-label={t("pagination")} className="mt-10 flex items-center justify-center gap-2">
          {page > 1 ? (
            <Button asChild variant="outline" className="rounded-full">
              <Link href={eventSearchHref(search, { page: page - 1 })} rel="prev">
                <ArrowRight className="ltr:hidden" aria-hidden />
                <ArrowLeft className="rtl:hidden" aria-hidden />
                {t("prevPage")}
              </Link>
            </Button>
          ) : null}
          <span className="px-3 text-sm text-muted-foreground tabular-nums">
            {t("pageOf", { page, count: pageCount })}
          </span>
          {page < pageCount ? (
            <Button asChild variant="outline" className="rounded-full">
              <Link href={eventSearchHref(search, { page: page + 1 })} rel="next">
                {t("nextPage")}
                <ArrowLeft className="ltr:hidden" aria-hidden />
                <ArrowRight className="rtl:hidden" aria-hidden />
              </Link>
            </Button>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
