import { CalendarCheck, CalendarClock, Hourglass, Users } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/account/section-card";
import type { Locale } from "@/i18n/routing";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * لوحة الإدارة — محمية على الخادم: غير المدير يحصل على 404.
 * الأرقام من قاعدة البيانات مباشرة، و RLS تسمح بها للمدير فقط.
 */
export default async function AdminPage({ params }: PageProps<"/[locale]/admin">) {
  const locale = (await params).locale as Locale;
  await requireAdmin(locale, `/${locale}/admin`);
  const t = await getTranslations("Admin");
  const format = await getFormatter();
  const supabase = await createClient();

  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const [users, pendingOrganizers, pendingEvents, publishedEvents] = await Promise.all([
    count(supabase.from("profiles").select("*", { count: "exact", head: true })),
    count(supabase.from("organizers").select("*", { count: "exact", head: true }).eq("status", "pending")),
    count(supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "pending_review")),
    count(supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "published")),
  ]);

  const stats = [
    { label: t("stats.users"), value: users, icon: Users },
    { label: t("stats.pendingOrganizers"), value: pendingOrganizers, icon: Hourglass },
    { label: t("stats.pendingEvents"), value: pendingEvents, icon: CalendarClock },
    { label: t("stats.publishedEvents"), value: publishedEvents, icon: CalendarCheck },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <li key={label} className="rounded-2xl border bg-card p-5">
            <Icon className="size-5 text-primary" aria-hidden />
            <p className="mt-4 text-3xl font-bold tabular-nums">{format.number(value)}</p>
            <p className="mt-1 text-sm text-muted-foreground">{label}</p>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-sm text-muted-foreground">{t("comingSoon")}</p>
    </div>
  );
}
