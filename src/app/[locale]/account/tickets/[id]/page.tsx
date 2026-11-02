import { CalendarDays, MapPin, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";

import { PrintButton } from "@/components/booking/print-button";
import { TicketStatusBadge } from "@/components/booking/ticket-status-badge";
import { Logo } from "@/components/layout/logo";
import { getMyTicket, getTicketQrSvg } from "@/features/booking/queries";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { robots: { index: false, follow: false } };
// الرمز سري: لا تخزين مؤقت
export const dynamic = "force-dynamic";

/** التذكرة الإلكترونية: رمز QR فريد (لمالكها فقط)، بيانات الفعالية، الحالة، وطباعة/حفظ PDF */
export default async function TicketPage({ params }: PageProps<"/[locale]/account/tickets/[id]">) {
  const { locale: rawLocale, id } = await params;
  const locale = rawLocale as Locale;
  const user = await requireUser(locale, `/${locale}/account/tickets/${id}`);
  const ticket = await getMyTicket(id, user.userId);
  const [t, tAreas, format, qrSvg] = await Promise.all([
    getTranslations("Tickets"),
    getTranslations("Areas"),
    getFormatter(),
    ticket.status === "void" ? Promise.resolve(null) : getTicketQrSvg(ticket.id),
  ]);
  const e = ticket.events;
  const venue = e?.is_online
    ? t("online")
    : [locale === "ar" ? e?.venue_name_ar : e?.venue_name_en, e?.governorate ? tAreas(e.governorate) : null]
        .filter(Boolean)
        .join(" · ");

  return (
    <div className="mx-auto grid max-w-md gap-5 px-4 py-10 print:max-w-none print:py-0">
      <article
        className="glass neon-border overflow-hidden rounded-3xl print:border print:shadow-none"
        data-testid="e-ticket"
        aria-labelledby="ticket-title"
      >
        <div className="bg-gradient-neon p-5 text-white">
          <div className="flex items-center justify-between">
            <Logo className="text-white" />
            <TicketStatusBadge status={ticket.status} />
          </div>
          <h1 id="ticket-title" className="mt-4 text-2xl font-extrabold">
            {locale === "ar" ? e?.title_ar : e?.title_en}
          </h1>
          <p className="mt-1 text-white/85">
            {locale === "ar" ? ticket.ticket_types?.name_ar : ticket.ticket_types?.name_en}
          </p>
        </div>

        <div className="grid justify-items-center gap-3 border-b border-dashed p-6">
          {qrSvg && ticket.status === "valid" ? (
            <div
              className="rounded-2xl bg-white p-3"
              role="img"
              aria-label={t("qrLabel")}
              data-testid="ticket-qr"
              // SVG مولّد على خادمنا من مكتبة qrcode (لا يحتوي مدخلات مستخدم)
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground" data-testid="ticket-no-qr">
              {ticket.status === "checked_in"
                ? t("usedAt", { date: format.dateTime(new Date(ticket.checked_in_at!), "eventDateTime") })
                : t("voided")}
            </p>
          )}
          <p className="font-mono text-lg font-bold tracking-wider" dir="ltr" data-testid="ticket-code">
            {ticket.code}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" aria-hidden />
            {t("qrHint")}
          </p>
        </div>

        <dl className="grid gap-3 p-5 text-sm">
          <div className="flex gap-2">
            <dt className="sr-only">{t("date")}</dt>
            <CalendarDays className="size-4 shrink-0 text-primary" aria-hidden />
            <dd>{e ? format.dateTime(new Date(e.starts_at), "eventDateTime") : "—"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="sr-only">{t("venue")}</dt>
            <MapPin className="size-4 shrink-0 text-primary" aria-hidden />
            <dd>{venue || "—"}</dd>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <dt>{t("order")}</dt>
            <dd dir="ltr" className="font-mono">
              {ticket.orders?.order_number}
            </dd>
          </div>
        </dl>
      </article>

      <div className="flex flex-wrap justify-between gap-2 print:hidden">
        <PrintButton />
        {e ? (
          <Link href={`/events/${e.slug}`} className="self-center text-sm text-primary hover:underline">
            {t("eventPage")}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
