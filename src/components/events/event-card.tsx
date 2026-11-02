import { CalendarDays, MapPin } from "lucide-react";
import Image from "next/image";
import { useFormatter, useLocale, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { categories } from "@/config/site";
import type { EventAvailability, EventCardData } from "@/features/events/types";
import { Link } from "@/i18n/navigation";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

const availabilityStyles: Record<EventAvailability, string> = {
  available: "bg-background/90 text-success border-success/30",
  sold_out: "bg-background/90 text-warning border-warning/30",
  cancelled: "bg-background/90 text-destructive border-destructive/30",
  ended: "bg-background/90 text-muted-foreground border-border",
};

/** غلاف بديل عند عدم وجود صورة: تدرج بألوان الهوية مع أيقونة التصنيف */
function CoverFallback({ category }: { category: EventCardData["category"] }) {
  const Icon = categories.find((c) => c.slug === category)?.icon;
  return (
    <div className="bg-gradient-brand relative grid size-full place-items-center overflow-hidden">
      <div className="absolute -end-10 -top-10 size-40 rounded-full bg-white/15 blur-2xl" aria-hidden />
      <div className="absolute -start-6 -bottom-12 size-36 rounded-full bg-black/15 blur-2xl" aria-hidden />
      {Icon ? <Icon className="size-14 text-white/85" strokeWidth={1.5} aria-hidden /> : null}
    </div>
  );
}

export function EventCard({ event, priority = false }: { event: EventCardData; priority?: boolean }) {
  const t = useTranslations("EventCard");
  const tCategories = useTranslations("Categories");
  const tAreas = useTranslations("Areas");
  const format = useFormatter();
  const locale = useLocale();

  const isInactive = event.availability === "cancelled" || event.availability === "ended";
  const price =
    event.minPriceFils === null
      ? null
      : event.minPriceFils === 0
        ? t("free")
        : t("from", { price: formatMoney(event.minPriceFils, locale) });

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-xs transition-all duration-300",
        "focus-within:ring-2 focus-within:ring-ring/50 hover:shadow-xl hover:shadow-primary/10 motion-safe:hover:-translate-y-1",
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <div className="size-full transition-transform duration-500 motion-safe:group-hover:scale-105">
          {event.coverUrl ? (
            <Image
              src={event.coverUrl}
              alt=""
              fill
              sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw"
              className={cn("object-cover", isInactive && "grayscale")}
              priority={priority}
            />
          ) : (
            <CoverFallback category={event.category} />
          )}
        </div>
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <Badge variant="secondary" className="bg-background/85 backdrop-blur">
            {tCategories(event.category)}
          </Badge>
          {event.availability !== "available" ? (
            <Badge variant="outline" className={cn("backdrop-blur", availabilityStyles[event.availability])}>
              {t(`status.${event.availability}`)}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <p className="dark:text-gradient-brand flex items-center gap-1.5 text-sm font-semibold text-primary">
          <CalendarDays className="size-4 shrink-0" aria-hidden />
          <time dateTime={event.startsAt}>{format.dateTime(new Date(event.startsAt), "eventDateTime")}</time>
        </p>
        <h3 className="line-clamp-2 text-base leading-snug font-semibold">
          {/* الرابط يغطي البطاقة كاملة لتسهيل النقر مع إبقاء عنوان واضح لقارئ الشاشة */}
          <Link href={`/events/${event.slug}`} className="outline-none after:absolute after:inset-0">
            {event.title}
          </Link>
        </h3>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="size-4 shrink-0" aria-hidden />
          <span className="truncate">
            {event.venueName}
            {event.area ? ` · ${tAreas(event.area)}` : null}
          </span>
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3 text-sm">
          <span className="truncate text-muted-foreground">
            {t("byOrganizer", { name: event.organizerName })}
          </span>
          {price ? <span className="shrink-0 font-semibold">{price}</span> : null}
        </div>
      </div>
    </article>
  );
}

export function EventCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card" aria-hidden>
      <Skeleton className="aspect-[16/10] rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex justify-between border-t pt-3">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-1/5" />
        </div>
      </div>
    </div>
  );
}

export function EventGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );
}
