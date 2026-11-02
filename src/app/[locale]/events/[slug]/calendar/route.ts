import { buildIcs } from "@/features/events/calendar";
import { getEventDetails } from "@/features/events/queries";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { siteUrl } from "@/lib/site-url";

/** تنزيل ملف .ics للفعالية (منشورة فقط — غير ذلك 404) */
export async function GET(_req: Request, ctx: RouteContext<"/[locale]/events/[slug]/calendar">) {
  const { locale, slug } = await ctx.params;
  if (!hasLocale(routing.locales, locale)) return new Response("Not found", { status: 404 });
  const event = await getEventDetails(slug, locale);
  if (!event || event.status !== "published") return new Response("Not found", { status: 404 });

  const location = event.isOnline
    ? null
    : [event.venueName, event.address, event.areaName].filter(Boolean).join("، ");
  const ics = buildIcs({
    id: event.id,
    title: event.title,
    description: event.summary ?? event.description,
    location,
    url: `${siteUrl}/${locale}/events/${event.slug}`,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
  });

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}.ics"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
