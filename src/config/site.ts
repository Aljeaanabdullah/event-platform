import {
  Briefcase,
  BookOpen,
  Cpu,
  Drama,
  Images,
  Mic2,
  Music,
  PartyPopper,
  Presentation,
  Tent,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

export { siteUrl } from "@/lib/site-url";

/**
 * التصنيفات المبدئية. الأسماء في ملفات الترجمة (Categories.<slug>).
 * في Phase 3 تصبح جدول event_categories في قاعدة البيانات بنفس الـ slugs.
 */
export const categories = [
  { slug: "conferences", icon: Mic2 },
  { slug: "workshops", icon: Presentation },
  { slug: "tech-ai", icon: Cpu },
  { slug: "business", icon: Briefcase },
  { slug: "exhibitions", icon: Images },
  { slug: "entertainment", icon: PartyPopper },
  { slug: "theater", icon: Drama },
  { slug: "music", icon: Music },
  { slug: "sports", icon: Trophy },
  { slug: "family", icon: Users },
  { slug: "education", icon: BookOpen },
  { slug: "outdoor", icon: Tent },
] as const satisfies ReadonlyArray<{ slug: string; icon: LucideIcon }>;

export type CategorySlug = (typeof categories)[number]["slug"];
export const categorySlugs = categories.map((c) => c.slug) as [CategorySlug, ...CategorySlug[]];

/** محافظات الكويت الست */
export const areas = ["capital", "hawalli", "farwaniya", "ahmadi", "jahra", "mubarak-al-kabeer"] as const;
export type AreaSlug = (typeof areas)[number];

/** فترات زمنية جاهزة للبحث. نهاية الأسبوع في الكويت: الخميس–السبت */
export const datePresets = ["any", "today", "tomorrow", "this-week", "weekend", "next-30-days"] as const;
export type DatePreset = (typeof datePresets)[number];

export function isCategorySlug(value: unknown): value is CategorySlug {
  return typeof value === "string" && categories.some((c) => c.slug === value);
}
export function isAreaSlug(value: unknown): value is AreaSlug {
  return typeof value === "string" && (areas as readonly string[]).includes(value);
}
export function isDatePreset(value: unknown): value is DatePreset {
  return typeof value === "string" && (datePresets as readonly string[]).includes(value);
}
