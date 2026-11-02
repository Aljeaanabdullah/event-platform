import { getTranslations } from "next-intl/server";

import { CategoriesGrid } from "@/components/home/categories-grid";
import { EventSection } from "@/components/home/event-section";
import { FeaturedSection } from "@/components/home/featured-section";
import { Hero } from "@/components/home/hero";
import { OrganizersCta } from "@/components/home/organizers-cta";
import { StatsBar } from "@/components/home/stats-bar";
import { getHomeSections } from "@/features/events/queries";

// الصفحة ثابتة وتُحدَّث كل 5 دقائق (الإحصائيات والفعاليات من قاعدة البيانات)
export const revalidate = 300;

export default async function HomePage() {
  const t = await getTranslations("Home");
  const sections = await getHomeSections();

  // "مميزة" أولًا، وإن لم توجد نعرض القادمة في نفس الإطار
  const featured = sections.featured.length > 0 ? sections.featured : sections.upcoming;

  const more = [
    { key: "thisWeek", events: sections.thisWeek, href: "/events?date=this-week" },
    { key: "weekend", events: sections.weekend, href: "/events?date=weekend" },
    { key: "free", events: sections.free, href: "/events?price=free" },
    { key: "popular", events: sections.popular, href: "/events?sort=popular" },
  ] as const;

  return (
    <>
      <Hero />
      <FeaturedSection events={featured.slice(0, 9)} />
      <StatsBar />
      {more.map((s) => (
        <EventSection
          key={s.key}
          id={`section-${s.key}`}
          title={t(`${s.key}.title`)}
          subtitle={t(`${s.key}.subtitle`)}
          events={s.events}
          viewAllHref={s.href}
        />
      ))}
      <CategoriesGrid />
      <OrganizersCta />
    </>
  );
}
