import {
  CalendarCheck,
  Globe2,
  QrCode,
  ShieldCheck,
  Ticket,
  Trophy,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import { Reveal } from "@/components/motion/reveal";
import { getPlatformStats, STATS_MIN_PUBLISHED_EVENTS, type PlatformStats } from "@/features/platform/stats";

type Item = { icon: LucideIcon; value?: string; label: string };

/**
 * شريط الثقة بنمط المرجع: الشعار + أرقام حقيقية من قاعدة البيانات.
 * قبل أن تصبح الأرقام ذات معنى، تُعرض مزايا المنصة بدلها (لا أرقام وهمية أو صفرية).
 */
export async function StatsBar() {
  const stats = await getPlatformStats();
  return <StatsBarView stats={stats && stats.publishedEvents >= STATS_MIN_PUBLISHED_EVENTS ? stats : null} />;
}

/** العرض فقط — تستخدمه أيضًا صفحة المعاينة للتطوير */
export async function StatsBarView({ stats }: { stats: PlatformStats | null }) {
  const t = await getTranslations("Stats");
  const format = await getFormatter();
  const plus = (n: number) => `+${format.number(n)}`;

  const items: Item[] = stats
    ? [
        { icon: CalendarCheck, value: plus(stats.publishedEvents), label: t("events") },
        { icon: UserRound, value: plus(stats.registeredUsers), label: t("users") },
        { icon: UsersRound, value: plus(stats.approvedOrganizers), label: t("organizers") },
        { icon: Ticket, value: plus(stats.ticketsSold), label: t("tickets") },
      ]
    : [
        { icon: ShieldCheck, label: t("featurePayments") },
        { icon: QrCode, label: t("featureTickets") },
        { icon: Globe2, label: t("featureBilingual") },
      ];

  return (
    <section aria-label={t("label")} className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Reveal>
        <div
          className="glass neon-border grid items-center gap-6 rounded-3xl px-6 py-6 sm:px-8 lg:grid-cols-[1.5fr_repeat(var(--cols),minmax(0,1fr))] lg:gap-0"
          data-testid="stats-bar"
          data-mode={stats ? "numbers" : "features"}
          style={{ ["--cols" as string]: items.length }}
        >
          <p className="flex items-center gap-3 text-lg font-bold lg:pe-6">
            <Trophy
              className="size-8 shrink-0 text-violet-400 drop-shadow-[0_0_10px_var(--glow-strong)]"
              strokeWidth={1.6}
              aria-hidden
            />
            {t("slogan")}
          </p>
          {items.map(({ icon: Icon, value, label }) => (
            <div
              key={label}
              className="flex items-center gap-3 lg:justify-center lg:border-s lg:border-[var(--glass-border)] lg:px-5"
            >
              <Icon className="size-8 shrink-0 text-violet-400" strokeWidth={1.5} aria-hidden />
              <div className="leading-tight">
                {value ? (
                  <p className="text-2xl font-bold tabular-nums" dir="ltr">
                    {value}
                  </p>
                ) : null}
                <p className={value ? "text-sm text-muted-foreground" : "font-semibold"}>{label}</p>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
