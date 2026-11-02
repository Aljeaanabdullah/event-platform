import { Ban, CalendarDays, MapPin, Ticket } from "lucide-react";
import Image from "next/image";
import { useFormatter, useLocale, useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui/skeleton";
import { categories } from "@/config/site";
import type { EventAvailability, EventCardData } from "@/features/events/types";
import { Link } from "@/i18n/navigation";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

import { CoverArt } from "./cover-art";
import { FavoriteButton } from "./favorite-button";

const statusBadge: Partial<Record<EventAvailability, string>> = {
  cancelled: "bg-zinc-900/80 text-zinc-100 border-white/20",
  ended: "bg-zinc-900/80 text-zinc-200 border-white/15",
};

/**
 * بطاقة فعالية بنمط المرجع: الغلاف يملأ البطاقة، تدرج داكن، العنوان فوق الصورة،
 * شارة التصنيف وزر المفضلة في الأعلى، والسعر وزر الحجز في الأسفل.
 * النصوص فوق التدرج الداكن بيضاء في الثيمين لضمان التباين.
 */
export function EventCard({ event, priority = false }: { event: EventCardData; priority?: boolean }) {
  const t = useTranslations("EventCard");
  const tCategories = useTranslations("CategoriesShort");
  const tAreas = useTranslations("Areas");
  const format = useFormatter();
  const locale = useLocale();

  const CategoryIcon = categories.find((c) => c.slug === event.category)?.icon;
  const inactive = event.availability === "cancelled" || event.availability === "ended";
  const soldOut = event.availability === "sold_out";
  const href = `/events/${event.slug}`;
  const price =
    event.minPriceFils === null
      ? null
      : event.minPriceFils === 0
        ? t("free")
        : formatMoney(event.minPriceFils, locale);

  return (
    <article
      className={cn(
        "group neon-border relative isolate flex aspect-[4/3.1] flex-col justify-between overflow-hidden rounded-3xl text-white sm:aspect-[1.62/1]",
        "transition-shadow duration-500 hover:shadow-[0_0_0_1px_color-mix(in_oklch,var(--brand-violet)_70%,transparent),0_18px_60px_-12px_var(--glow-strong)]",
      )}
    >
      {/* الغلاف */}
      <div className="absolute inset-0 -z-10 transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.06]">
        {event.coverUrl ? (
          <Image
            src={event.coverUrl}
            alt=""
            fill
            sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
            className={cn("object-cover", inactive && "grayscale")}
            priority={priority}
          />
        ) : (
          <CoverArt category={event.category} className={cn(inactive && "grayscale")} />
        )}
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0b0620] via-[#0b0620]/55 to-transparent" />

      {/* الصف العلوي: التصنيف + المفضلة */}
      <div className="relative z-20 flex items-start justify-between gap-2 p-3.5">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-xs font-semibold backdrop-blur-md">
          {CategoryIcon ? <CategoryIcon className="size-3.5" aria-hidden /> : null}
          {tCategories(event.category)}
        </span>
        <div className="flex items-center gap-2">
          {statusBadge[event.availability] ? (
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-semibold backdrop-blur-md",
                statusBadge[event.availability],
              )}
            >
              {t(`status.${event.availability}`)}
            </span>
          ) : null}
          <FavoriteButton eventId={event.id} />
        </div>
      </div>

      {/* المحتوى السفلي */}
      <div className="relative grid gap-1.5 p-4 pt-0 sm:p-5 sm:pt-0">
        <h3 className="line-clamp-2 text-lg leading-snug font-bold drop-shadow-sm sm:text-xl">
          {/* الرابط يغطي البطاقة كاملة، والأزرار فوقه بطبقة أعلى */}
          <Link
            href={href}
            className="outline-none after:absolute after:inset-0 after:z-10 focus-visible:underline"
          >
            {event.title}
          </Link>
        </h3>
        <p className="flex items-center gap-1.5 text-sm text-white/80">
          <MapPin className="size-4 shrink-0" aria-hidden />
          <span className="truncate">
            {event.venueName}
            {event.area ? ` · ${tAreas(event.area)}` : null}
          </span>
        </p>
        <p className="flex items-center gap-1.5 text-sm text-white/80">
          <CalendarDays className="size-4 shrink-0" aria-hidden />
          <time dateTime={event.startsAt}>{format.dateTime(new Date(event.startsAt), "eventDate")}</time>
        </p>

        <div className="mt-2 flex items-center justify-between gap-3">
          {price ? (
            <span className="text-xl font-bold tracking-tight tabular-nums sm:text-2xl" dir="auto">
              {price}
            </span>
          ) : (
            <span />
          )}
          {soldOut ? (
            <span className="relative z-20 inline-flex h-10 items-center gap-1.5 rounded-xl bg-red-600 px-4 text-sm font-bold shadow-[0_8px_24px_-8px_rgba(220,38,38,0.8)]">
              <Ban className="size-4" aria-hidden />
              {t("status.sold_out")}
            </span>
          ) : inactive ? null : (
            <Link
              href={href}
              className="relative z-20 inline-flex h-10 items-center gap-1.5 rounded-xl bg-gradient-neon px-4 text-sm font-bold glow-primary transition-transform hover:scale-[1.04] focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none active:scale-95"
            >
              <Ticket className="size-4" aria-hidden />
              {t("bookNow")}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

export function EventCardSkeleton() {
  return (
    <div
      className="relative aspect-[4/3.1] overflow-hidden rounded-3xl border sm:aspect-[1.62/1]"
      aria-hidden
    >
      <Skeleton className="absolute inset-0 rounded-none" />
      <div className="absolute inset-x-0 bottom-0 space-y-2.5 p-5">
        <Skeleton className="h-5 w-3/4 bg-foreground/10" />
        <Skeleton className="h-4 w-1/2 bg-foreground/10" />
        <div className="flex justify-between pt-2">
          <Skeleton className="h-7 w-24 bg-foreground/10" />
          <Skeleton className="h-10 w-28 rounded-xl bg-foreground/10" />
        </div>
      </div>
    </div>
  );
}

export function EventGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );
}
