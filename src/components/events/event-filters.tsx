"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useRef, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { areas, categories, datePresets } from "@/config/site";
import type { EventSearch } from "@/features/events/search-params";
import { eventSorts } from "@/features/events/search-params";
import { useRouter } from "@/i18n/navigation";

/**
 * شريط البحث والفلاتر. نموذج GET عادي (يعمل بدون JavaScript) يحفظ كل الفلاتر في الرابط.
 * مع JavaScript: ننتقل دون إعادة تحميل وبرابط نظيف (بلا معاملات فارغة)، وتغيير أي قائمة يُرسل فورًا.
 * تغيير أي فلتر يعيد الترقيم للصفحة الأولى (لا نرسل page).
 */
export function EventFilters({ search }: { search: EventSearch }) {
  const t = useTranslations("Events");
  const tCategories = useTranslations("Categories");
  const tAreas = useTranslations("Areas");
  const tDates = useTranslations("DatePresets");
  const locale = useLocale();
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const submit = () => formRef.current?.requestSubmit();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(e.currentTarget)) {
      const v = String(value).trim();
      if (v && !(key === "sort" && v === "date")) params.set(key, v);
    }
    const qs = params.toString();
    startTransition(() => router.push(qs ? `/events?${qs}` : "/events", { scroll: false }));
  }

  const selectClass = "w-full [&_select]:h-11 [&_select]:rounded-xl [&_select]:bg-background/60";

  return (
    <form
      ref={formRef}
      action={`/${locale}/events`}
      onSubmit={onSubmit}
      aria-busy={pending}
      role="search"
      aria-label={t("searchLabel")}
      className="glass grid gap-3 rounded-3xl p-4 sm:p-5"
      data-testid="event-filters"
    >
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            name="q"
            defaultValue={search.q}
            maxLength={100}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchLabel")}
            className="h-11 rounded-xl bg-background/60 ps-10"
          />
        </div>
        <Button type="submit" className="h-11 rounded-xl bg-gradient-neon px-5 font-semibold text-white">
          {t("searchButton")}
        </Button>
      </div>

      <fieldset className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <legend className="sr-only">
          <SlidersHorizontal aria-hidden /> {t("filtersLegend")}
        </legend>
        <div className="grid gap-1 text-xs font-medium text-muted-foreground">
          <label htmlFor={`${id}-category`}>{t("filter.category")}</label>
          <NativeSelect
            id={`${id}-category`}
            name="category"
            defaultValue={search.category ?? ""}
            onChange={submit}
            className={selectClass}
          >
            <NativeSelectOption value="">{t("filter.all")}</NativeSelectOption>
            {categories.map((c) => (
              <NativeSelectOption key={c.slug} value={c.slug}>
                {tCategories(c.slug)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-1 text-xs font-medium text-muted-foreground">
          <label htmlFor={`${id}-area`}>{t("filter.area")}</label>
          <NativeSelect
            id={`${id}-area`}
            name="area"
            defaultValue={search.area ?? ""}
            onChange={submit}
            className={selectClass}
          >
            <NativeSelectOption value="">{t("filter.allAreas")}</NativeSelectOption>
            {areas.map((a) => (
              <NativeSelectOption key={a} value={a}>
                {tAreas(a)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-1 text-xs font-medium text-muted-foreground">
          <label htmlFor={`${id}-date`}>{t("filter.date")}</label>
          <NativeSelect
            id={`${id}-date`}
            name="date"
            defaultValue={search.date ?? ""}
            onChange={submit}
            className={selectClass}
          >
            {datePresets.map((d) => (
              <NativeSelectOption key={d} value={d === "any" ? "" : d}>
                {tDates(d)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-1 text-xs font-medium text-muted-foreground">
          <label htmlFor={`${id}-day`}>{t("filter.day")}</label>
          <Input
            id={`${id}-day`}
            type="date"
            name="day"
            defaultValue={search.day}
            onChange={submit}
            className="h-11 rounded-xl bg-background/60"
          />
        </div>
        <div className="grid gap-1 text-xs font-medium text-muted-foreground">
          <label htmlFor={`${id}-price`}>{t("filter.price")}</label>
          <NativeSelect
            id={`${id}-price`}
            name="price"
            defaultValue={search.price ?? ""}
            onChange={submit}
            className={selectClass}
          >
            <NativeSelectOption value="">{t("filter.anyPrice")}</NativeSelectOption>
            <NativeSelectOption value="free">{t("filter.free")}</NativeSelectOption>
            <NativeSelectOption value="paid">{t("filter.paid")}</NativeSelectOption>
          </NativeSelect>
        </div>
        <div className="grid gap-1 text-xs font-medium text-muted-foreground">
          <label htmlFor={`${id}-sort`}>{t("filter.sort")}</label>
          <NativeSelect
            id={`${id}-sort`}
            name="sort"
            defaultValue={search.sort ?? "date"}
            onChange={submit}
            className={selectClass}
          >
            {eventSorts.map((s) => (
              <NativeSelectOption key={s} value={s}>
                {t(`sort.${s}`)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </fieldset>
    </form>
  );
}
