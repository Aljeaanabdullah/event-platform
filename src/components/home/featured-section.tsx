import { ArrowLeft, ArrowRight, CalendarPlus, Flame } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { EventCard } from "@/components/events/event-card";
import { routes } from "@/components/layout/nav-links";
import { Reveal } from "@/components/motion/reveal";
import { TiltCard } from "@/components/motion/tilt-card";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import type { EventCardData } from "@/features/events/types";
import { Link } from "@/i18n/navigation";

import { CarouselItem, FeaturedCarousel } from "./featured-carousel";

/**
 * قسم "فعاليات مميزة" بنمط المرجع: عنوان بأيقونة لهب، زر "عرض جميع الفعاليات"، وعرض دوّار.
 * بدون فعاليات حقيقية يُعرض نفس الإطار مع حالة فارغة صادقة (لا بيانات وهمية).
 */
export async function FeaturedSection({ events }: { events: EventCardData[] }) {
  const t = await getTranslations("Home");

  return (
    <section aria-labelledby="featured-title" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Reveal>
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2
              id="featured-title"
              className="flex items-center gap-2.5 text-2xl font-bold tracking-tight sm:text-3xl"
            >
              <Flame
                className="size-7 text-pink-500 drop-shadow-[0_0_10px_rgba(236,72,153,0.7)]"
                aria-hidden
              />
              {t("featured.title")}
            </h2>
            <p className="mt-1.5 text-muted-foreground">{t("featured.subtitle")}</p>
          </div>
          <Button asChild variant="ghost" className="glass h-10 rounded-full px-5 font-semibold">
            <Link href="/events">
              {t("viewAllEvents")}
              <ArrowLeft className="ltr:hidden" aria-hidden />
              <ArrowRight className="rtl:hidden" aria-hidden />
            </Link>
          </Button>
        </div>
      </Reveal>

      {events.length > 0 ? (
        <Reveal delay={0.1}>
          <FeaturedCarousel count={events.length}>
            {events.map((event, i) => (
              <CarouselItem key={event.id}>
                <TiltCard className="h-full" maxTilt={4}>
                  <EventCard event={event} priority={i < 3} />
                </TiltCard>
              </CarouselItem>
            ))}
          </FeaturedCarousel>
        </Reveal>
      ) : (
        <Reveal delay={0.1}>
          <EmptyState
            className="glass"
            title={t("empty.title")}
            description={t("empty.description")}
            action={
              <Button asChild className="rounded-full bg-gradient-neon px-5 text-white glow-primary">
                <Link href={routes.addEvent}>
                  <CalendarPlus aria-hidden />
                  {t("organizers.cta")}
                </Link>
              </Button>
            }
          />
        </Reveal>
      )}
    </section>
  );
}
