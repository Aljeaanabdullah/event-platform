import { CalendarPlus } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { routes } from "@/components/layout/nav-links";
import { CategoriesGrid } from "@/components/home/categories-grid";
import { EventSection } from "@/components/home/event-section";
import { Hero } from "@/components/home/hero";
import { OrganizersCta } from "@/components/home/organizers-cta";
import { Reveal } from "@/components/motion/reveal";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { getHomeSections } from "@/features/events/queries";
import { Link } from "@/i18n/navigation";

export default async function HomePage() {
  const t = await getTranslations("Home");
  const sections = await getHomeSections();

  const list = [
    { key: "featured", events: sections.featured, href: "/events?featured=1" },
    { key: "thisWeek", events: sections.thisWeek, href: "/events?date=this-week" },
    { key: "weekend", events: sections.weekend, href: "/events?date=weekend" },
    { key: "free", events: sections.free, href: "/events?price=free" },
    { key: "upcoming", events: sections.upcoming, href: "/events" },
    { key: "popular", events: sections.popular, href: "/events?sort=popular" },
  ] as const;

  const hasEvents = list.some((s) => s.events.length > 0);

  return (
    <>
      <Hero />

      {hasEvents ? (
        list.map((s) => (
          <EventSection
            key={s.key}
            id={`section-${s.key}`}
            title={t(`${s.key}.title`)}
            subtitle={t(`${s.key}.subtitle`)}
            events={s.events}
            viewAllHref={s.href}
          />
        ))
      ) : (
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" aria-label={t("empty.title")}>
          <Reveal>
            <EmptyState
              title={t("empty.title")}
              description={t("empty.description")}
              action={
                <Button asChild>
                  <Link href={routes.addEvent}>
                    <CalendarPlus aria-hidden />
                    {t("organizers.cta")}
                  </Link>
                </Button>
              }
            />
          </Reveal>
        </section>
      )}

      <CategoriesGrid />
      <OrganizersCta />
    </>
  );
}
