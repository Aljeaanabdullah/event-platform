import { z } from "zod";

import { areas, categorySlugs, datePresets } from "@/config/site";

/**
 * معاملات البحث في رابط صفحة الفعاليات. القيم غير الصالحة تُتجاهل بدل إظهار خطأ،
 * لأن الرابط قد يُعدَّل يدويًا أو يأتي من مصدر خارجي.
 */
const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.enum(values).optional().catch(undefined);

export const eventSorts = ["date", "price-asc", "price-desc", "newest"] as const;
export type EventSort = (typeof eventSorts)[number];

export const EVENTS_PAGE_SIZE = 12;
export const MAX_PAGE = 50;

export const eventSearchSchema = z.object({
  q: z
    .string()
    .trim()
    .max(100)
    .optional()
    .catch(undefined)
    .transform((v) => v || undefined),
  area: optionalEnum(areas),
  category: optionalEnum(categorySlugs),
  date: optionalEnum(datePresets).transform((v) => (v === "any" ? undefined : v)),
  /** يوم محدد بتوقيت الكويت (يتقدم على date إذا وُجد) */
  day: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined),
  price: optionalEnum(["free", "paid"] as const),
  sort: optionalEnum(eventSorts).transform((v) => (v === "date" ? undefined : v)),
  page: z.coerce.number().int().min(1).max(MAX_PAGE).optional().catch(undefined),
});

export type EventSearch = z.infer<typeof eventSearchSchema>;

export function parseEventSearch(raw: Record<string, string | string[] | undefined>): EventSearch {
  const first = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  return eventSearchSchema.parse(first);
}

/** يبني رابط البحث مع حذف القيم الفارغة/الافتراضية (روابط نظيفة وثابتة للمشاركة و SEO) */
export function eventSearchHref(search: EventSearch, overrides: Partial<EventSearch> = {}): string {
  const merged = { ...search, ...overrides };
  const params = new URLSearchParams();
  for (const key of ["q", "category", "area", "date", "day", "price", "sort", "page"] as const) {
    const value = merged[key];
    if (value === undefined || value === null || value === "") continue;
    if (key === "page" && value === 1) continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `/events?${qs}` : "/events";
}
