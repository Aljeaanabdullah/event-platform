import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/account/section-card";
import { OrganizerApplyForm } from "@/components/organizer/apply-form";
import type { Locale } from "@/i18n/routing";
import { requireUser } from "@/lib/auth/session";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/organizer/apply">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "Organizer.applyForm" });
  return { title: t("title"), robots: { index: false } };
}

export default async function OrganizerApplyPage({ params }: PageProps<"/[locale]/organizer/apply">) {
  const locale = (await params).locale as Locale;
  const user = await requireUser(locale, `/${locale}/organizer/apply`);
  const t = await getTranslations("Organizer.applyForm");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <div className="rounded-2xl border bg-card p-5 sm:p-6">
        <OrganizerApplyForm defaultEmail={user.email ?? ""} />
      </div>
    </div>
  );
}
