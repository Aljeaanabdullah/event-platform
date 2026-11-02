import { getTranslations } from "next-intl/server";

import { Reveal } from "@/components/motion/reveal";
import { categories } from "@/config/site";
import { Link } from "@/i18n/navigation";

import { SectionHeader } from "./event-section";

export async function CategoriesGrid() {
  const t = await getTranslations("Home.categories");
  const tCategories = await getTranslations("Categories");

  return (
    <section
      id="categories"
      aria-labelledby="categories-title"
      className="mx-auto max-w-7xl scroll-mt-24 px-4 py-12 sm:px-6 lg:px-8"
    >
      <Reveal>
        <SectionHeader id="categories-title" title={t("title")} subtitle={t("subtitle")} />
      </Reveal>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {categories.map(({ slug, icon: Icon }, i) => (
          <Reveal as="li" key={slug} delay={(i % 6) * 0.04}>
            <Link
              href={`/events?category=${slug}`}
              className="group flex h-full flex-col items-start gap-3 rounded-2xl border bg-card p-4 transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 motion-safe:hover:-translate-y-0.5"
            >
              <span className="group-hover:bg-gradient-brand grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground transition-colors duration-300 group-hover:text-white">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="font-medium">{tCategories(slug)}</span>
            </Link>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
