import "server-only";

import { getTranslations } from "next-intl/server";
import { cache } from "react";

import type { Locale } from "@/i18n/routing";
import { kuwaitDayRange, presetRange, type DateRange } from "@/lib/kuwait-time";
import { logger } from "@/lib/logger";
import { createPublicClient } from "@/lib/supabase/public";
import type { Database } from "@/types/database";

import { cardFromSearchRow, detailsFromJson, type EventDetailsJson } from "./mappers";
import { EVENTS_PAGE_SIZE, type EventSearch } from "./search-params";
import type { EventCardData, EventDetails, EventSearchResult, HomeSections } from "./types";
import { includeTestData } from "./visibility";

type SearchArgs = Database["public"]["Functions"]["search_events"]["Args"];

const sortParam = { "price-asc": "price_asc", "price-desc": "price_desc", newest: "newest" } as const;

/**
 * كل القراءات العامة تمر عبر دوال search_events / get_event_details:
 * تُرجع فقط فعاليات منشورة لجهات معتمدة (وبيانات الاختبار مستبعدة في الإنتاج).
 * عميل "عام" بلا كوكيز حتى تبقى الصفحات قابلة للتخزين المؤقت (ISR).
 */
async function runSearch(
  args: SearchArgs,
  locale: Locale,
): Promise<{ events: EventCardData[]; total: number }> {
  const supabase = createPublicClient();
  if (!supabase) return { events: [], total: 0 };
  const { data, error } = await supabase.rpc("search_events", { ...args, p_include_test: includeTestData() });
  if (error) {
    logger.error("search_events failed", error, { code: error.code });
    return { events: [], total: 0 };
  }
  return {
    events: data.map((row) => cardFromSearchRow(row, locale)),
    total: data[0] ? Number(data[0].total_count) : 0,
  };
}

function rangeFor(search: Pick<EventSearch, "date" | "day">): DateRange | null {
  if (search.day) return kuwaitDayRange(search.day);
  if (search.date) return presetRange(search.date);
  return null;
}

export async function searchEvents(search: EventSearch, locale: Locale): Promise<EventSearchResult> {
  const page = search.page ?? 1;
  const range = rangeFor(search);
  const { events, total } = await runSearch(
    {
      p_q: search.q,
      p_category: search.category,
      p_governorate: search.area,
      p_from: range?.from.toISOString(),
      p_to: range?.to.toISOString(),
      p_price: search.price,
      p_sort: search.sort ? sortParam[search.sort] : "date",
      p_limit: EVENTS_PAGE_SIZE,
      p_offset: (page - 1) * EVENTS_PAGE_SIZE,
    },
    locale,
  );
  return { events, total, page, pageCount: Math.max(1, Math.ceil(total / EVENTS_PAGE_SIZE)) };
}

async function popularEvents(locale: Locale): Promise<EventCardData[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("get_popular_events", { p_limit: 8 });
  if (error || !data?.length) return [];
  const ids = data.map((r) => r.event_id);
  const { events } = await runSearch({ p_ids: ids, p_limit: 8 }, locale);
  // نحافظ على ترتيب الشعبية
  return ids.flatMap((id) => events.filter((e) => e.id === id));
}

export async function getHomeSections(locale: Locale): Promise<HomeSections> {
  const iso = (r: DateRange) => ({ p_from: r.from.toISOString(), p_to: r.to.toISOString() });
  const [featured, thisWeek, weekend, free, upcoming, popular] = await Promise.all([
    runSearch({ p_featured: true, p_limit: 9 }, locale),
    runSearch({ ...iso(presetRange("this-week")), p_limit: 8 }, locale),
    runSearch({ ...iso(presetRange("weekend")), p_limit: 8 }, locale),
    runSearch({ p_price: "free", p_limit: 8 }, locale),
    runSearch({ p_limit: 9 }, locale),
    popularEvents(locale),
  ]);
  return {
    featured: featured.events,
    thisWeek: thisWeek.events,
    weekend: weekend.events,
    free: free.events,
    upcoming: upcoming.events,
    popular,
  };
}

/** تفاصيل فعالية عامة — null إذا غير موجودة أو غير منشورة (=> 404) */
export const getEventDetails = cache(async (slug: string, locale: Locale): Promise<EventDetails | null> => {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 120) return null;
  const supabase = createPublicClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_event_details", {
    p_slug: slug,
    p_include_test: includeTestData(),
  });
  if (error) {
    logger.error("get_event_details failed", error, { code: error.code });
    return null;
  }
  if (!data) return null;
  const tAreas = await getTranslations({ locale, namespace: "Areas" });
  return detailsFromJson(data as unknown as EventDetailsJson, locale, (s) => tAreas(s as never));
});

export async function getSimilarEvents(event: EventDetails, locale: Locale): Promise<EventCardData[]> {
  const sameCategory = await runSearch(
    { p_category: event.category, p_exclude: event.id, p_limit: 4 },
    locale,
  );
  if (sameCategory.events.length >= 2) return sameCategory.events;
  const upcoming = await runSearch({ p_exclude: event.id, p_limit: 4 }, locale);
  const seen = new Set(sameCategory.events.map((e) => e.id));
  return [...sameCategory.events, ...upcoming.events.filter((e) => !seen.has(e.id))].slice(0, 4);
}

/** للـ sitemap: كل الفعاليات المنشورة القادمة */
export async function listPublishedEventSlugs(): Promise<{ slug: string; startsAt: string }[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const out: { slug: string; startsAt: string }[] = [];
  for (let offset = 0; offset < 5000; offset += 100) {
    const { data, error } = await supabase.rpc("search_events", {
      p_limit: 100,
      p_offset: offset,
      p_include_test: includeTestData(),
    });
    if (error || !data.length) break;
    out.push(...data.map((r) => ({ slug: r.slug, startsAt: r.starts_at })));
    if (data.length < 100) break;
  }
  return out;
}
