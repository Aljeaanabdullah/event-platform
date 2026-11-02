import { Briefcase, Plus } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/account/section-card";
import { EmptyState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireUser } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/[locale]/organizer">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "Organizer" });
  return { title: t("title"), robots: { index: false } };
}

const statusStyle = {
  pending: "bg-warning/15 text-warning border-warning/30",
  approved: "bg-success/15 text-success border-success/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  suspended: "bg-muted text-muted-foreground",
} as const;

/** حالة طلبات المنظّم والجهات — أدوات الفعاليات تُضاف في Phase 6 */
export default async function OrganizerPage({ params }: PageProps<"/[locale]/organizer">) {
  const locale = (await params).locale as Locale;
  const user = await requireUser(locale, `/${locale}/organizer`);
  const t = await getTranslations("Organizer");

  if (user.memberships.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <PageHeader title={t("title")} subtitle={t("subtitle")} />
        <EmptyState
          icon={Briefcase}
          title={t("emptyTitle")}
          description={t("emptyBody")}
          action={
            <Button asChild>
              <Link href="/organizer/apply">{t("apply")}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")}>
        <Button asChild variant="outline">
          <Link href="/organizer/apply">
            <Plus aria-hidden />
            {t("applyAnother")}
          </Link>
        </Button>
      </PageHeader>

      <ul className="grid gap-4" data-testid="organizer-memberships">
        {user.memberships.map((m) => (
          <li key={m.organizerId} className="rounded-2xl border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold">{locale === "ar" ? m.nameAr : m.nameEn}</p>
                <p className="text-sm text-muted-foreground" dir="ltr">
                  /organizers/{m.slug}
                </p>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">{t(`memberRole.${m.role}`)}</Badge>
                <Badge variant="outline" className={cn(statusStyle[m.status])}>
                  {t(`status.${m.status}`)}
                </Badge>
              </div>
            </div>
            {m.status === "rejected" && m.rejectionReason ? (
              <p className="mt-3 text-sm text-destructive">
                {t("rejectionReason", { reason: m.rejectionReason })}
              </p>
            ) : null}
            {m.status === "approved" ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("dashboardSoon")}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
