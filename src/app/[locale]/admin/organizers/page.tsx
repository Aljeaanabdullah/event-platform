import { Building2 } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/account/section-card";
import { ReviewActions } from "@/components/admin/review-actions";
import { EmptyState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { listOrganizerApplications } from "@/features/admin/queries";
import type { Locale } from "@/i18n/routing";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** طلبات الانضمام كمنظّم — للمدير فقط */
export default async function AdminOrganizersPage({ params }: PageProps<"/[locale]/admin/organizers">) {
  const locale = (await params).locale as Locale;
  await requireAdmin(locale, `/${locale}/admin/organizers`);
  const [t, tOrg, format, orgs] = await Promise.all([
    getTranslations("AdminReview"),
    getTranslations("Organizer"),
    getFormatter(),
    listOrganizerApplications(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader title={t("organizersTitle")} subtitle={t("organizersSubtitle")} />
      {orgs.length === 0 ? (
        <EmptyState icon={Building2} title={t("emptyTitle")} description={t("emptyBody")} />
      ) : (
        <ul className="grid gap-4">
          {orgs.map((o) => (
            <li key={o.id} className="glass grid gap-3 rounded-3xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold">{locale === "ar" ? o.name_ar : o.name_en}</p>
                  <p className="text-sm text-muted-foreground" dir="ltr">
                    {o.contact_email}
                    {o.contact_phone ? ` · ${o.contact_phone}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format.dateTime(new Date(o.created_at), "eventDateTime")}
                  </p>
                </div>
                <div className="flex gap-2">
                  {o.is_test ? <Badge variant="outline">{t("testData")}</Badge> : null}
                  <Badge variant="outline">{tOrg(`status.${o.status}`)}</Badge>
                </div>
              </div>
              {o.description_ar || o.description_en ? (
                <p className="text-sm text-muted-foreground">
                  {locale === "ar" ? o.description_ar : o.description_en}
                </p>
              ) : null}
              {o.status === "pending" ? <ReviewActions kind="organizer" id={o.id} /> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
