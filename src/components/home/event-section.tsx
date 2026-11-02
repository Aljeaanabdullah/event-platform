import { ArrowLeft, ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { EventCard } from "@/components/events/event-card";
import { Reveal } from "@/components/motion/reveal";
import { TiltCard } from "@/components/motion/tilt-card";
import { Button } from "@/components/ui/button";
import type { EventCardData } from "@/features/events/types";
import { Link } from "@/i18n/navigation";

export function SectionHeader({
  id,
  title,
  subtitle,
  action,
}: {
  id: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 id={id} className="text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h2>
        {subtitle ? <p className="mt-2 text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

/** قسم فعاليات في الصفحة الرئيسية — لا يُعرض إطلاقًا إذا لم توجد فعاليات */
export async function EventSection({
  id,
  title,
  subtitle,
  events,
  viewAllHref,
}: {
  id: string;
  title: string;
  subtitle?: string;
  events: EventCardData[];
  viewAllHref: string;
}) {
  if (events.length === 0) return null;
  const t = await getTranslations("Common");

  return (
    <section aria-labelledby={id} className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <Reveal>
        <SectionHeader
          id={id}
          title={title}
          subtitle={subtitle}
          action={
            <Button asChild variant="ghost">
              <Link href={viewAllHref}>
                {t("viewAll")}
                <ArrowRight className="rtl:hidden" aria-hidden />
                <ArrowLeft className="ltr:hidden" aria-hidden />
              </Link>
            </Button>
          }
        />
      </Reveal>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {events.slice(0, 8).map((event, i) => (
          <Reveal as="li" key={event.id} delay={Math.min(i, 3) * 0.06}>
            <TiltCard className="h-full">
              <EventCard event={event} />
            </TiltCard>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
