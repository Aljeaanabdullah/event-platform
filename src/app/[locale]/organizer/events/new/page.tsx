import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/account/section-card";
import { EventWizard } from "@/components/organizer/event-wizard";
import type { EventFormInput } from "@/features/organizer/event-schema";
import { pickOrganizer } from "@/features/organizer/queries";
import type { Locale } from "@/i18n/routing";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { robots: { index: false } };

export default async function NewEventPage({
  params,
  searchParams,
}: PageProps<"/[locale]/organizer/events/new">) {
  const locale = (await params).locale as Locale;
  const { org } = await searchParams;
  const user = await requireUser(locale, `/${locale}/organizer/events/new`);
  const current = pickOrganizer(user, org);
  // فقط owner/manager في جهة معتمدة
  if (!current) notFound();
  const t = await getTranslations("EventForm");

  const initial: EventFormInput = {
    organizerId: current.organizerId,
    categorySlug: "conferences",
    titleAr: "",
    titleEn: "",
    summaryAr: "",
    summaryEn: "",
    descriptionAr: "",
    descriptionEn: "",
    coverPath: null,
    gallery: [],
    startsAtLocal: "",
    endsAtLocal: "",
    isOnline: false,
    venueNameAr: "",
    venueNameEn: "",
    addressAr: "",
    addressEn: "",
    governorate: "",
    area: "",
    latitude: "",
    longitude: "",
    tickets: [],
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader title={t("newTitle")} subtitle={locale === "ar" ? current.nameAr : current.nameEn} />
      <EventWizard
        eventId={null}
        initialValues={initial}
        organizerName={locale === "ar" ? current.nameAr : current.nameEn}
      />
    </div>
  );
}
