import { CheckCircle2, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { routes } from "@/components/layout/nav-links";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export async function OrganizersCta() {
  const t = await getTranslations("Home.organizers");
  const points = [t("point1"), t("point2"), t("point3"), t("point4")];

  return (
    <section
      id="organizers"
      aria-labelledby="organizers-title"
      className="mx-auto max-w-7xl scroll-mt-24 px-4 py-12 sm:px-6 lg:px-8"
    >
      <Reveal>
        <div className="relative isolate overflow-hidden rounded-3xl bg-[oklch(0.2_0.06_280)] px-6 py-12 text-white sm:px-12 lg:py-16">
          <div
            aria-hidden
            className="bg-gradient-brand absolute -end-24 -top-24 -z-10 size-96 rounded-full opacity-60 blur-3xl"
          />
          <div
            aria-hidden
            className="absolute -start-20 -bottom-32 -z-10 size-80 rounded-full bg-blue-500/30 blur-3xl"
          />
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold tracking-wide text-violet-200">{t("eyebrow")}</p>
              <h2
                id="organizers-title"
                className="mt-3 text-3xl font-bold tracking-tight text-balance sm:text-4xl"
              >
                {t("title")}
              </h2>
              <p className="mt-4 max-w-lg text-lg text-white/80">{t("description")}</p>
              <Button asChild size="xl" className="mt-8 bg-white text-violet-900 hover:bg-white/90">
                <Link href={routes.addEvent}>
                  <Plus aria-hidden />
                  {t("cta")}
                </Link>
              </Button>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {points.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur"
                >
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-violet-300" aria-hidden />
                  <span className="text-white/90">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
