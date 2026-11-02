"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * عرض دوّار أفقي يعتمد على CSS scroll-snap (سحب طبيعي باللمس، بلا مكتبات).
 * الأزرار والنقاط تعمل في الاتجاهين: في RTL يكون "التالي" نحو اليسار.
 * العناصر تُمرَّر كأبناء (تُرسم على الخادم).
 */
export function FeaturedCarousel({ children, count }: { children: React.ReactNode; count: number }) {
  const t = useTranslations("Home.carousel");
  const track = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const item = el.firstElementChild as HTMLElement | null;
    const perView = item ? Math.max(1, Math.round(el.clientWidth / item.offsetWidth)) : 1;
    setPages(Math.max(1, Math.ceil(count / perView)));
    // scrollLeft سالب في RTL — نستخدم القيمة المطلقة
    setPage(Math.round(Math.abs(el.scrollLeft) / el.clientWidth));
  }, [count]);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    el.addEventListener("scroll", measure, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", measure);
    };
  }, [measure]);

  function go(target: number) {
    const el = track.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    const clamped = Math.max(0, Math.min(pages - 1, target));
    el.scrollTo({ left: (rtl ? -1 : 1) * clamped * el.clientWidth, behavior: "smooth" });
  }

  const arrow =
    "glass absolute top-1/2 z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full transition-all hover:border-primary/50 hover:shadow-[0_0_24px_-4px_var(--glow)] focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-30 md:grid";

  return (
    <div className="relative" role="region" aria-roledescription="carousel">
      <button
        type="button"
        onClick={() => go(page - 1)}
        disabled={page === 0}
        aria-label={t("previous")}
        className={cn(arrow, "-start-5 xl:-start-14")}
      >
        <ChevronRight className="size-5 ltr:hidden" aria-hidden />
        <ChevronLeft className="size-5 rtl:hidden" aria-hidden />
      </button>

      <div
        ref={track}
        className="-mx-4 flex snap-x snap-mandatory [scrollbar-width:none] gap-5 overflow-x-auto scroll-smooth px-4 pt-2 pb-4 sm:-mx-1 sm:px-1 [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>

      <button
        type="button"
        onClick={() => go(page + 1)}
        disabled={page >= pages - 1}
        aria-label={t("next")}
        className={cn(arrow, "-end-5 xl:-end-14")}
      >
        <ChevronLeft className="size-5 ltr:hidden" aria-hidden />
        <ChevronRight className="size-5 rtl:hidden" aria-hidden />
      </button>

      {pages > 1 ? (
        <div className="mt-3 flex justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={t("goTo", { n: i + 1 })}
              aria-current={i === page ? "true" : undefined}
              className={cn(
                "h-2.5 rounded-full transition-all duration-300 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none",
                i === page
                  ? "w-7 bg-gradient-neon shadow-[0_0_12px_var(--glow-strong)]"
                  : "w-2.5 bg-foreground/25 hover:bg-foreground/45",
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** غلاف عنصر داخل العرض الدوّار (عرض ثابت حسب الشاشة + محاذاة snap) */
export function CarouselItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-[88%] shrink-0 snap-start sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)]">
      {children}
    </div>
  );
}
