import { FlaskConical } from "lucide-react";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { FeaturedSection } from "@/components/home/featured-section";
import { Hero } from "@/components/home/hero";
import { StatsBarView } from "@/components/home/stats-bar";
import type { EventCardData } from "@/features/events/types";

export const metadata = { robots: { index: false, follow: false } };

/**
 * معاينة الصفحة الرئيسية ببيانات تجريبية — للتطوير ومقارنة التصميم بالمرجع فقط.
 * تُرجع 404 في الإنتاج، وكل البيانات هنا وهمية وموسومة بوضوح.
 */
export default async function HomePreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const t = await getTranslations("DevShowcase");
  const ar = (await getLocale()) === "ar";

  const sample: EventCardData[] = [
    {
      id: "00000000-0000-4000-a000-000000000001",
      slug: "sample-concert",
      title: ar ? "حفل موسيقي (عيّنة)" : "Live concert (sample)",
      coverUrl: null,
      startsAt: "2026-12-19T17:00:00Z",
      venueName: ar ? "أرينا الكويت" : "Kuwait Arena",
      area: null,
      category: "music",
      organizerName: "Sample",
      minPriceFils: 25_000,
      availability: "available",
    },
    {
      id: "00000000-0000-4000-a000-000000000002",
      slug: "sample-ai-summit",
      title: ar ? "مؤتمر الذكاء الاصطناعي 2026 (عيّنة)" : "AI Summit 2026 (sample)",
      coverUrl: null,
      startsAt: "2026-12-15T06:00:00Z",
      venueName: ar ? "مركز الكويت للمؤتمرات" : "Kuwait Convention Center",
      area: null,
      category: "tech-ai",
      organizerName: "Sample",
      minPriceFils: 15_000,
      availability: "available",
    },
    {
      id: "00000000-0000-4000-a000-000000000003",
      slug: "sample-national-day",
      title: ar ? "احتفالات العيد الوطني (عيّنة)" : "National Day celebration (sample)",
      coverUrl: null,
      startsAt: "2027-02-25T16:00:00Z",
      venueName: ar ? "الواجهة البحرية" : "Waterfront",
      area: null,
      category: "family",
      organizerName: "Sample",
      minPriceFils: 5_000,
      availability: "sold_out",
    },
    {
      id: "00000000-0000-4000-a000-000000000004",
      slug: "sample-derby",
      title: ar ? "ديربي كرة القدم (عيّنة)" : "Football derby (sample)",
      coverUrl: null,
      startsAt: "2027-01-08T15:00:00Z",
      venueName: ar ? "استاد جابر" : "Jaber Stadium",
      area: null,
      category: "sports",
      organizerName: "Sample",
      minPriceFils: 3_000,
      availability: "available",
    },
  ];

  return (
    <>
      <p
        role="note"
        className="mx-auto mt-2 flex max-w-7xl items-center gap-2 px-4 text-sm text-amber-600 sm:px-6 lg:px-8 dark:text-amber-300"
      >
        <FlaskConical className="size-4 shrink-0" aria-hidden />
        {t("homePreviewBanner")}
      </p>
      <Hero />
      <FeaturedSection events={sample} />
      <StatsBarView
        stats={{
          publishedEvents: 1200,
          registeredUsers: 50_000,
          approvedOrganizers: 200,
          ticketsSold: 85_000,
        }}
      />
    </>
  );
}
