import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { EventCard, EventGridSkeleton } from "@/components/events/event-card";
import { TiltCard } from "@/components/motion/tilt-card";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import type { EventCardData } from "@/features/events/types";

import { ToastDemo } from "./toast-demo";

export const metadata = { robots: { index: false, follow: false } };

/**
 * صفحة عرض مكونات الهوية البصرية — للتطوير فقط.
 * البيانات هنا تجريبية وواضحة، والصفحة تُرجع 404 في نسخة الإنتاج.
 */
export default async function DevUiPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const t = await getTranslations("DevShowcase");

  // تواريخ ثابتة للعرض فقط
  const at = (iso: string) => new Date(iso).toISOString();
  const sample: EventCardData[] = [
    {
      id: "s1",
      slug: "sample-1",
      title: "Sample · AI Summit Kuwait",
      coverUrl: null,
      startsAt: at("2026-12-03T18:00:00+03:00"),
      venueName: "Sample Venue",
      area: "capital",
      category: "tech-ai",
      organizerName: "Sample Org",
      minPriceFils: 15_000,
      availability: "available",
    },
    {
      id: "s2",
      slug: "sample-2",
      title: "Sample · Family Fun Day",
      coverUrl: null,
      startsAt: at("2026-12-05T16:00:00+03:00"),
      venueName: "Sample Park",
      area: "hawalli",
      category: "family",
      organizerName: "Sample Org",
      minPriceFils: 0,
      availability: "available",
    },
    {
      id: "s3",
      slug: "sample-3",
      title: "Sample · Jazz Night",
      coverUrl: null,
      startsAt: at("2026-12-10T20:30:00+03:00"),
      venueName: "Sample Hall",
      area: "ahmadi",
      category: "music",
      organizerName: "Sample Org",
      minPriceFils: 7_500,
      availability: "sold_out",
    },
    {
      id: "s4",
      slug: "sample-4",
      title: "Sample · Theater Evening",
      coverUrl: null,
      startsAt: at("2026-10-28T19:00:00+03:00"),
      venueName: "Sample Theater",
      area: "jahra",
      category: "theater",
      organizerName: "Sample Org",
      minPriceFils: 5_000,
      availability: "ended",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-14 px-4 py-12 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("description")}</p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">{t("cards")}</h2>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {sample.map((e) => (
            <li key={e.id}>
              <TiltCard className="h-full">
                <EventCard event={e} />
              </TiltCard>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">{t("skeletons")}</h2>
        <EventGridSkeleton count={4} />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">{t("states")}</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <EmptyState title={t("sampleInfo")} description={t("description")} />
          <ErrorState title={t("sampleError")} description={t("description")} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">{t("toasts")}</h2>
        <ToastDemo />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">{t("buttons")}</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="xl">Primary XL</Button>
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>
    </div>
  );
}
