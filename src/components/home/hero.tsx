import { Search } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { Reveal } from "@/components/motion/reveal";
import { HeroVisual } from "@/components/three/hero-visual";
import { localeDirection, type Locale } from "@/i18n/routing";

import { CategoryTiles } from "./category-tiles";
import { KuwaitSkyline } from "./kuwait-skyline";

/**
 * قسم البطل بنمط المرجع:
 *  - جهة البداية (يمين بالعربية): العنوان بسطرين (الثاني بتدرج نيون)، الوصف، البحث، بلاطات التصنيفات.
 *  - جهة النهاية (يسار بالعربية): أفق الكويت + التذكرة ثلاثية الأبعاد فوق منصة متوهجة.
 * البحث يعمل بدون JavaScript (GET إلى صفحة الفعاليات).
 */
export async function Hero() {
  const t = await getTranslations("Hero");
  const tCommon = await getTranslations("Common");
  const locale = (await getLocale()) as Locale;

  const ticketLabels = {
    brand: tCommon("appName"),
    title: t("ticketTitle"),
    subtitle: t("ticketSubtitle"),
    dir: localeDirection[locale],
  };

  return (
    <section className="relative isolate overflow-hidden" aria-labelledby="hero-title">
      {/* إضاءة الخلفية */}
      <div aria-hidden className="hero-glow absolute inset-0 -z-20" />
      <div
        aria-hidden
        className="absolute start-1/3 -bottom-40 -z-20 size-[36rem] rounded-full bg-brand-violet/30 blur-[120px] dark:bg-brand-violet/35"
      />

      {/* تلاشي سفلي حتى لا يظهر حد حاد بين الـ Hero والقسم التالي */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-background"
      />

      {/* أفق الكويت في الطرف (يسار بالعربية، يمين بالإنجليزية) */}
      <div
        aria-hidden
        className="absolute inset-y-0 end-0 -z-10 hidden w-[38%] [mask-image:linear-gradient(to_var(--fade-dir),black_45%,transparent),linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)] [mask-composite:intersect] opacity-75 [--fade-dir:left] md:block rtl:[--fade-dir:right] dark:opacity-100"
      >
        <KuwaitSkyline className="size-full" idPrefix="ks-desktop" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-6 px-4 pt-6 pb-10 sm:px-6 md:pt-10 lg:grid-cols-[1.12fr_0.88fr] lg:gap-2 lg:px-8 lg:pb-16">
        <div className="relative z-10 order-2 lg:order-1">
          <Reveal>
            <h1
              id="hero-title"
              className="text-[2.15rem] leading-[1.22] font-bold tracking-tight text-balance sm:text-5xl lg:text-[3.4rem]"
            >
              <span className="block">{t("titleLine1")}</span>
              <span className="text-gradient-neon block pb-1">{t("titleLine2")}</span>
            </h1>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="mt-4 max-w-xl text-base text-pretty text-muted-foreground sm:text-lg">
              {t("subtitle")}
            </p>
          </Reveal>

          <Reveal delay={0.16}>
            <form
              action={`/${locale}/events`}
              method="get"
              role="search"
              aria-label={t("searchFormLabel")}
              className="glass mt-7 flex h-14 max-w-2xl items-center gap-2 rounded-2xl p-1.5 ps-5 transition-colors focus-within:border-primary/60 focus-within:shadow-[0_0_28px_-6px_var(--glow)]"
            >
              <label htmlFor="hero-q" className="sr-only">
                {t("searchLabel")}
              </label>
              <input
                id="hero-q"
                name="q"
                type="search"
                maxLength={100}
                autoComplete="off"
                placeholder={t("searchPlaceholder")}
                className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                aria-label={t("submit")}
                className="grid h-full w-14 shrink-0 place-items-center rounded-xl bg-gradient-neon text-white glow-primary transition-transform hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none active:scale-95"
              >
                <Search className="size-5" aria-hidden />
              </button>
            </form>
          </Reveal>

          <Reveal delay={0.24} className="mt-6">
            <CategoryTiles />
          </Reveal>
        </div>

        <div className="relative order-1 lg:order-2">
          {/* على الجوال: الأفق خلف التذكرة مباشرة */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 [mask-image:radial-gradient(closest-side,black,transparent)] opacity-70 md:hidden"
          >
            <KuwaitSkyline className="size-full" idPrefix="ks-mobile" />
          </div>
          <HeroVisual
            labels={ticketLabels}
            className="mx-auto h-[300px] w-full max-w-[640px] sm:h-[380px] lg:h-[520px]"
          />
        </div>
      </div>
    </section>
  );
}
