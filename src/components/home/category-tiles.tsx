import { LayoutGrid } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { categories, type CategorySlug } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** التصنيفات المعروضة كبلاطات في الـ Hero (بالترتيب الظاهر في التصميم المرجعي) */
const heroCategories: CategorySlug[] = ["music", "conferences", "exhibitions", "tech-ai", "sports", "family"];

/**
 * بلاطات التصنيفات: أيقونة فوق الاسم، زجاجية، مع حالة نشطة متوهجة.
 * روابط حقيقية لصفحة الفعاليات مع فلتر التصنيف (تعمل بلوحة المفاتيح).
 */
export async function CategoryTiles({ active = "all" }: { active?: CategorySlug | "all" }) {
  const t = await getTranslations("CategoriesShort");
  const tHero = await getTranslations("Hero");

  const items = [
    { slug: "all" as const, href: "/events", icon: LayoutGrid, label: tHero("allCategories") },
    ...heroCategories.map((slug) => ({
      slug,
      href: `/events?category=${slug}`,
      icon: categories.find((c) => c.slug === slug)!.icon,
      label: t(slug),
    })),
  ];

  return (
    <nav aria-label={tHero("categoriesLabel")}>
      <ul className="flex flex-wrap gap-2 sm:gap-2.5">
        {items.map(({ slug, href, icon: Icon, label }) => {
          const isActive = slug === active;
          return (
            <li key={slug}>
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group flex h-[72px] min-w-[74px] flex-col items-center justify-center gap-1.5 rounded-2xl px-2 text-xs font-semibold transition-all duration-300 sm:h-[78px] sm:min-w-[80px] sm:text-sm",
                  "focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none",
                  isActive
                    ? "neon-border bg-primary/15 text-foreground"
                    : "glass text-foreground/85 hover:border-primary/40 hover:text-foreground motion-safe:hover:-translate-y-0.5",
                )}
              >
                <Icon
                  className={cn(
                    "size-6 transition-transform duration-300 motion-safe:group-hover:scale-110",
                    isActive ? "text-primary dark:text-violet-300" : "text-foreground/80",
                  )}
                  strokeWidth={1.6}
                  aria-hidden
                />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
