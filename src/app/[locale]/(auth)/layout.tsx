import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { InteractiveBackdrop } from "@/components/motion/interactive-backdrop";
import { Reveal } from "@/components/motion/reveal";
import { HeroVisual } from "@/components/three/hero-visual";
import { localeDirection, type Locale } from "@/i18n/routing";

// صفحات المصادقة لا تُفهرس في محركات البحث
export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * تخطيط صفحات المصادقة: النموذج في جهة، ومجسم التذكرة ثلاثي الأبعاد في الجهة الأخرى.
 * المجسم نفسه المستخدم في الصفحة الرئيسية (تحميل كسول + بديل ثابت).
 * على الجوال يُخفى المجسم حتى يظهر النموذج فورًا.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("Auth.layout");
  const tHero = await getTranslations("Hero");
  const tCommon = await getTranslations("Common");

  const ticketLabels = {
    brand: tCommon("appName"),
    title: tHero("ticketTitle"),
    subtitle: tHero("ticketSubtitle"),
    dir: localeDirection[locale],
  };

  return (
    <div className="relative isolate overflow-hidden">
      <InteractiveBackdrop className="-z-10" />
      <div className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="mx-auto w-full max-w-md">
          <Reveal>{children}</Reveal>
        </div>

        <aside className="hidden flex-col items-center gap-8 lg:flex" aria-hidden>
          <HeroVisual labels={ticketLabels} className="aspect-[4/3] w-full max-w-xl" />
          <div className="max-w-md space-y-4 text-center">
            <p className="text-2xl font-semibold text-balance">{t("tagline")}</p>
            <ul className="inline-grid gap-2 text-start text-muted-foreground">
              {[t("benefit1"), t("benefit2"), t("benefit3")].map((b) => (
                <li key={b} className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-primary" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
