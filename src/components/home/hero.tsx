import { CalendarDays, MapPin, Search, Sparkles, Tag } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { Reveal } from "@/components/motion/reveal";
import { InteractiveBackdrop } from "@/components/motion/interactive-backdrop";
import { HeroVisual } from "@/components/three/hero-visual";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { areas, categories, datePresets } from "@/config/site";
import { localeDirection, type Locale } from "@/i18n/routing";

/**
 * قسم البطل: عنوان تسويقي + نموذج بحث حقيقي + مجسم تذكرة ثلاثي الأبعاد.
 * النموذج يعمل بدون JavaScript (GET إلى صفحة الفعاليات)، والمجسم زخرفي ويُحمّل لاحقًا.
 */
export async function Hero() {
  const t = await getTranslations("Hero");
  const tDates = await getTranslations("DatePresets");
  const tAreas = await getTranslations("Areas");
  const tCategories = await getTranslations("Categories");
  const tMeta = await getTranslations("Common");
  const locale = (await getLocale()) as Locale;

  const ticketLabels = {
    brand: tMeta("appName"),
    title: t("ticketTitle"),
    subtitle: t("ticketSubtitle"),
    dir: localeDirection[locale],
  };

  return (
    <section className="relative isolate overflow-hidden" aria-labelledby="hero-title">
      <InteractiveBackdrop className="-z-10" />

      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 pt-12 pb-16 sm:px-6 md:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:pb-24">
        <div className="relative z-10">
          <Reveal>
            <p className="inline-flex items-center gap-2 rounded-full border bg-card/70 px-3 py-1 text-sm text-muted-foreground backdrop-blur">
              <Sparkles className="size-4 text-primary" aria-hidden />
              {t("eyebrow")}
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <h1
              id="hero-title"
              className="mt-5 text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl"
            >
              {t("titleStart")}{" "}
              <span className="text-gradient-brand whitespace-nowrap">{t("titleHighlight")}</span>{" "}
              {t("titleEnd")}
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-5 max-w-xl text-lg text-pretty text-muted-foreground">{t("subtitle")}</p>
          </Reveal>

          <Reveal delay={0.24}>
            <form
              action={`/${locale}/events`}
              method="get"
              role="search"
              aria-label={t("searchFormLabel")}
              className="mt-8 grid gap-3 rounded-2xl border bg-card/80 p-3 shadow-xl shadow-black/5 backdrop-blur-xl sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end dark:shadow-black/30"
            >
              <div className="grid gap-1.5 sm:col-span-2 lg:col-span-4">
                <Label htmlFor="hero-q" className="ps-1 text-xs text-muted-foreground">
                  {t("searchLabel")}
                </Label>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    id="hero-q"
                    name="q"
                    type="search"
                    maxLength={100}
                    placeholder={t("searchPlaceholder")}
                    className="h-11 ps-9"
                    autoComplete="off"
                  />
                </div>
              </div>

              <Field id="hero-area" label={t("areaLabel")} icon={MapPin}>
                <NativeSelect id="hero-area" name="area" defaultValue="" className="w-full [&_select]:h-11">
                  <NativeSelectOption value="">{t("anyArea")}</NativeSelectOption>
                  {areas.map((a) => (
                    <NativeSelectOption key={a} value={a}>
                      {tAreas(a)}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>

              <Field id="hero-date" label={t("dateLabel")} icon={CalendarDays}>
                <NativeSelect
                  id="hero-date"
                  name="date"
                  defaultValue="any"
                  className="w-full [&_select]:h-11"
                >
                  {datePresets.map((d) => (
                    <NativeSelectOption key={d} value={d}>
                      {tDates(d)}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>

              <Field id="hero-category" label={t("categoryLabel")} icon={Tag}>
                <NativeSelect
                  id="hero-category"
                  name="category"
                  defaultValue=""
                  className="w-full [&_select]:h-11"
                >
                  <NativeSelectOption value="">{t("anyCategory")}</NativeSelectOption>
                  {categories.map((c) => (
                    <NativeSelectOption key={c.slug} value={c.slug}>
                      {tCategories(c.slug)}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>

              <Button type="submit" size="xl" className="sm:col-span-2 lg:col-span-1">
                <Search aria-hidden />
                {t("submit")}
              </Button>
            </form>
          </Reveal>
        </div>

        <HeroVisual
          labels={ticketLabels}
          className="order-first h-56 w-full sm:h-80 lg:order-none lg:aspect-square lg:h-auto"
        />
      </div>
    </section>
  );
}

function Field({
  id,
  label,
  icon: Icon,
  children,
}: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="flex items-center gap-1.5 ps-1 text-xs text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </Label>
      {children}
    </div>
  );
}
