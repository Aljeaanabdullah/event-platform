import { SearchX, X } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Reveal } from "@/components/motion/reveal";
import { EmptyState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { parseEventSearch } from "@/features/events/search-params";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({ params }: PageProps<"/[locale]/events">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as "ar" | "en", namespace: "Events" });
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: { canonical: `/${locale}/events`, languages: { ar: "/ar/events", en: "/en/events" } },
  };
}

/**
 * صفحة الفعاليات.
 * Phase 2: تقرأ عوامل التصفية من الرابط وتعرضها، ولا توجد فعاليات منشورة بعد فتظهر الحالة الفارغة.
 * Phase 5: تُضاف الاستعلامات الفعلية من Supabase والفلاتر الكاملة والترقيم.
 */
export default async function EventsPage({ searchParams }: PageProps<"/[locale]/events">) {
  const search = parseEventSearch(await searchParams);
  const t = await getTranslations("Events");
  const tAreas = await getTranslations("Areas");
  const tCategories = await getTranslations("Categories");
  const tDates = await getTranslations("DatePresets");
  const tCard = await getTranslations("EventCard");

  const active = [
    search.q ? `“${search.q}”` : null,
    search.category ? tCategories(search.category) : null,
    search.area ? tAreas(search.area) : null,
    search.date ? tDates(search.date) : null,
    search.price === "free" ? tCard("free") : null,
  ].filter((v): v is string => v !== null);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <Reveal>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
      </Reveal>

      {active.length > 0 ? (
        <div className="mt-6 flex flex-wrap items-center gap-2" aria-label={t("activeFilters")}>
          <span className="text-sm text-muted-foreground">{t("activeFilters")}:</span>
          {active.map((label) => (
            <Badge key={label} variant="secondary">
              {label}
            </Badge>
          ))}
          <Button asChild variant="ghost" size="sm">
            <Link href="/events">
              <X aria-hidden />
              {t("clearFilters")}
            </Link>
          </Button>
        </div>
      ) : null}

      <div className="mt-10">
        <EmptyState icon={SearchX} title={t("emptyTitle")} description={t("emptyDescription")} />
      </div>
    </div>
  );
}
