import { z } from "zod";

import { areas, categorySlugs, datePresets } from "@/config/site";

/**
 * معاملات البحث في رابط صفحة الفعاليات. القيم غير الصالحة تُتجاهل بدل إظهار خطأ،
 * لأن الرابط قد يُعدَّل يدويًا أو يأتي من مصدر خارجي.
 */
const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.enum(values).optional().catch(undefined);

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
  price: optionalEnum(["free", "paid"] as const),
});

export type EventSearch = z.infer<typeof eventSearchSchema>;

export function parseEventSearch(raw: Record<string, string | string[] | undefined>): EventSearch {
  const first = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  return eventSearchSchema.parse(first);
}
