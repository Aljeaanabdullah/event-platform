import {
  Ban,
  Building2,
  CalendarDays,
  CalendarPlus,
  Clock,
  ExternalLink,
  Globe,
  MapPin,
  Tag,
  Ticket,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";

import { BookingPanel } from "@/components/booking/booking-panel";
import { CoverArt } from "@/components/events/cover-art";
import { EventCard } from "@/components/events/event-card";
import { FavoriteButton } from "@/components/events/favorite-button";
import { ShareButton } from "@/components/events/share-button";
import { SectionHeader } from "@/components/home/event-section";
import { Reveal } from "@/components/motion/reveal";
import { TiltCard } from "@/components/motion/tilt-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { categories } from "@/config/site";
import { googleCalendarUrl } from "@/features/events/calendar";
import { getEventDetails, getSimilarEvents } from "@/features/events/queries";
import type { EventDetails } from "@/features/events/types";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { filsToKwdString } from "@/lib/money";
import { siteUrl } from "@/lib/site-url";
import { cn } from "@/lib/utils";

type Props = PageProps<"/[locale]/events/[slug]">;

// تتغير الأعداد المتاحة باستمرار: نعيد التوليد كل دقيقة، والحجز نفسه يتحقق في قاعدة البيانات
export const revalidate = 60;

// تُولَّد عند أول طلب ثم تُخزَّن (ISR) — لا نولّد مسبقًا وقت البناء
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const event = await getEventDetails(slug, locale as Locale);
  if (!event) return { robots: { index: false } };
  const description = (event.summary ?? event.description ?? "").slice(0, 160) || undefined;
  const images = event.coverUrl ? [{ url: event.coverUrl }] : undefined;
  return {
    title: event.title,
    description,
    alternates: {
      canonical: `/${locale}/events/${slug}`,
      languages: { ar: `/ar/events/${slug}`, en: `/en/events/${slug}` },
    },
    openGraph: { type: "article", title: event.title, description, images, locale },
    twitter: { card: images ? "summary_large_image" : "summary", title: event.title, description },
    robots: event.status === "cancelled" ? { index: false } : undefined,
  };
}

/** بيانات منظّمة schema.org/Event — فقط من حقول موجودة فعلًا */
function eventJsonLd(event: EventDetails, locale: string) {
  const url = `${siteUrl}/${locale}/events/${event.slug}`;
  const offers = event.ticketTypes.map((t) => ({
    "@type": "Offer",
    name: t.name,
    price: filsToKwdString(t.priceFils),
    priceCurrency: "KWD",
    availability: t.state === "on_sale" ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
    url,
    ...(t.salesStartAt ? { validFrom: t.salesStartAt } : {}),
  }));
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.summary ?? event.description ?? undefined,
    startDate: event.startsAt,
    endDate: event.endsAt,
    eventStatus:
      event.status === "cancelled"
        ? "https://schema.org/EventCancelled"
        : "https://schema.org/EventScheduled",
    eventAttendanceMode: event.isOnline
      ? "https://schema.org/OnlineEventAttendanceMode"
      : "https://schema.org/OfflineEventAttendanceMode",
    location: event.isOnline
      ? { "@type": "VirtualLocation", url }
      : {
          "@type": "Place",
          name: event.venueName ?? event.areaName ?? undefined,
          address: {
            "@type": "PostalAddress",
            streetAddress: event.address ?? undefined,
            addressRegion: event.areaName ?? undefined,
            addressCountry: "KW",
          },
          ...(event.latitude !== null
            ? { geo: { "@type": "GeoCoordinates", latitude: event.latitude, longitude: event.longitude } }
            : {}),
        },
    image: [event.coverUrl, ...event.images.map((i) => i.url)].filter(Boolean),
    organizer: { "@type": "Organization", name: event.organizer.name },
    offers: offers.length ? offers : undefined,
    url,
  };
}

/** خريطة OpenStreetMap (بلا مفاتيح أو تتبع) — تُعرض فقط عند وجود إحداثيات حقيقية */
function osmEmbed(lat: number, lng: number) {
  const d = 0.008;
  const bbox = [lng - d, lat - d, lng + d, lat + d].map((n) => n.toFixed(5)).join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
}

export default async function EventPage({ params }: Props) {
  const { locale: rawLocale, slug } = await params;
  const locale = rawLocale as Locale;
  const event = await getEventDetails(slug, locale);
  if (!event) notFound();

  const [t, tCard, format, similar] = await Promise.all([
    getTranslations("EventDetails"),
    getTranslations("EventCard"),
    getFormatter(),
    getSimilarEvents(event, locale),
  ]);

  const url = `${siteUrl}/${locale}/events/${event.slug}`;
  const CategoryIcon = categories.find((c) => c.slug === event.category)?.icon ?? Tag;
  const location = event.isOnline
    ? null
    : [event.venueName, event.address, event.areaName].filter(Boolean).join("، ");
  const sameDay =
    format.dateTime(new Date(event.startsAt), { dateStyle: "short" }) ===
    format.dateTime(new Date(event.endsAt), { dateStyle: "short" });
  const inactive = event.availability === "cancelled" || event.availability === "ended";

  return (
    <article className="pb-16" data-testid="event-details">
      <script
        type="application/ld+json"
        // JSON.stringify آمن هنا؛ نهرّب "<" لمنع إغلاق الوسم من داخل النص
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(eventJsonLd(event, locale)).replace(/</g, "\\u003c"),
        }}
      />

      {/* الغلاف */}
      <div className="relative isolate h-[42vh] min-h-72 w-full overflow-hidden sm:h-[52vh]">
        {event.coverUrl ? (
          <Image
            src={event.coverUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className={cn("object-cover", inactive && "grayscale")}
          />
        ) : (
          <CoverArt category={event.category} className={cn(inactive && "grayscale")} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>

      <div className="relative mx-auto -mt-40 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* المحتوى */}
          <div className="min-w-0">
            <Reveal>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/events?category=${event.category}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md hover:bg-black/60"
                >
                  <CategoryIcon className="size-3.5" aria-hidden />
                  {event.categoryName}
                </Link>
                {event.availability !== "available" && event.availability !== "no_tickets" ? (
                  <Badge variant="destructive" data-testid="event-status">
                    {tCard(`status.${event.availability}`)}
                  </Badge>
                ) : null}
              </div>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-balance sm:text-5xl">
                {event.title}
              </h1>
              <p className="mt-3 flex items-center gap-2 text-muted-foreground">
                <Building2 className="size-4" aria-hidden />
                {tCard("byOrganizer", { name: event.organizer.name })}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <FavoriteButton
                  eventId={event.id}
                  className="size-10 border-transparent bg-gradient-neon glow-soft"
                />
                <ShareButton title={event.title} url={url} />
                {event.status === "published" && !inactive ? (
                  <>
                    <Button asChild variant="outline" className="glass rounded-full">
                      <a href={`/${locale}/events/${event.slug}/calendar`} download data-testid="ics-link">
                        <CalendarPlus aria-hidden />
                        {t("addToCalendar")}
                      </a>
                    </Button>
                    <Button asChild variant="ghost" className="rounded-full">
                      <a
                        href={googleCalendarUrl({
                          id: event.id,
                          title: event.title,
                          description: event.summary,
                          location,
                          url,
                          startsAt: event.startsAt,
                          endsAt: event.endsAt,
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink aria-hidden />
                        {t("googleCalendar")}
                      </a>
                    </Button>
                  </>
                ) : null}
              </div>
            </Reveal>

            {event.status === "cancelled" ? (
              <div
                role="alert"
                className="mt-6 flex gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4"
              >
                <Ban className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
                <div>
                  <p className="font-semibold">{t("cancelledTitle")}</p>
                  {event.cancellationReason ? (
                    <p className="mt-1 text-sm text-muted-foreground">{event.cancellationReason}</p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* معلومات أساسية */}
            {/* dt/dd أبناء مباشرون لعناصر div داخل dl (بنية صالحة لقارئات الشاشة) */}
            <dl className="glass mt-8 grid gap-5 rounded-3xl p-5 sm:grid-cols-2 sm:p-6">
              <div>
                <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="size-4 text-primary" aria-hidden />
                  {t("date")}
                </dt>
                <dd className="mt-1 font-semibold">
                  <time dateTime={event.startsAt}>
                    {format.dateTime(new Date(event.startsAt), "eventDate")}
                  </time>
                  {sameDay ? null : (
                    <>
                      {" — "}
                      <time dateTime={event.endsAt}>
                        {format.dateTime(new Date(event.endsAt), "eventDate")}
                      </time>
                    </>
                  )}
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="size-4 text-primary" aria-hidden />
                  {t("time")}
                </dt>
                <dd className="mt-1 font-semibold tabular-nums">
                  {format.dateTimeRange(new Date(event.startsAt), new Date(event.endsAt), {
                    hour: "numeric",
                    minute: "2-digit",
                    ...(sameDay ? {} : { day: "numeric", month: "short" }),
                  })}
                  <span className="ms-2 text-xs font-normal text-muted-foreground">{t("kuwaitTime")}</span>
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                  {event.isOnline ? (
                    <Globe className="size-4 text-primary" aria-hidden />
                  ) : (
                    <MapPin className="size-4 text-primary" aria-hidden />
                  )}
                  {t("location")}
                </dt>
                <dd className="mt-1 font-semibold">
                  {event.isOnline ? t("online") : location || t("locationTba")}
                </dd>
              </div>
            </dl>

            {event.summary || event.description ? (
              <section aria-labelledby="about-title" className="mt-10">
                <h2 id="about-title" className="text-2xl font-bold">
                  {t("about")}
                </h2>
                {event.summary ? <p className="mt-3 text-lg text-foreground/90">{event.summary}</p> : null}
                {event.description ? (
                  <div className="mt-4 leading-8 whitespace-pre-line text-muted-foreground">
                    {event.description}
                  </div>
                ) : null}
              </section>
            ) : null}

            {event.images.length > 0 ? (
              <section aria-labelledby="gallery-title" className="mt-10">
                <h2 id="gallery-title" className="text-2xl font-bold">
                  {t("gallery")}
                </h2>
                <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {event.images.map((img) => (
                    <li key={img.url} className="relative aspect-[4/3] overflow-hidden rounded-2xl border">
                      <a href={img.url} target="_blank" rel="noopener noreferrer" aria-label={img.alt}>
                        <Image
                          src={img.url}
                          alt={img.alt}
                          fill
                          sizes="(min-width: 640px) 33vw, 50vw"
                          className="object-cover transition-transform duration-500 hover:scale-105"
                        />
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {event.latitude !== null && event.longitude !== null ? (
              <section aria-labelledby="map-title" className="mt-10">
                <h2 id="map-title" className="text-2xl font-bold">
                  {t("map")}
                </h2>
                <div className="neon-border mt-4 overflow-hidden rounded-3xl">
                  <iframe
                    title={t("mapTitle", { place: event.venueName ?? event.title })}
                    src={osmEmbed(event.latitude, event.longitude)}
                    className="h-72 w-full border-0 sm:h-96"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    sandbox="allow-scripts allow-same-origin allow-popups"
                    data-testid="event-map"
                  />
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="size-3.5" aria-hidden />
                  {t("openInMaps")}
                </a>
              </section>
            ) : null}
          </div>

          {/* التذاكر والحجز */}
          <aside aria-labelledby="tickets-title" className="lg:pt-48">
            <div className="glass neon-border sticky top-24 rounded-3xl p-5 sm:p-6" id="tickets">
              <h2 id="tickets-title" className="flex items-center gap-2 text-xl font-bold">
                <Ticket className="size-5 text-primary" aria-hidden />
                {t("tickets")}
              </h2>
              <BookingPanel
                eventId={event.id}
                eventSlug={event.slug}
                ticketTypes={event.ticketTypes}
                availability={event.availability}
              />
            </div>
          </aside>
        </div>

        {similar.length > 0 ? (
          <section aria-labelledby="similar-title" className="mt-16">
            <SectionHeader id="similar-title" title={t("similar")} />
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {similar.map((e) => (
                <li key={e.id}>
                  <TiltCard className="h-full">
                    <EventCard event={e} />
                  </TiltCard>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </article>
  );
}
