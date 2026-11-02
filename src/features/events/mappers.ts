/**
 * تحويل صفوف قاعدة البيانات إلى بيانات العرض (بدون اتصال — قابلة للاختبار).
 * لا نختلق أي قيمة: الحقول الغائبة تبقى null وتُخفى في الواجهة.
 */
import { isAreaSlug, isCategorySlug, type CategorySlug } from "@/config/site";
import type { Locale } from "@/i18n/routing";
import { publicMediaUrl } from "@/lib/storage";
import type { Database } from "@/types/database";

import type {
  EventAvailability,
  EventCardData,
  EventDetails,
  PublicTicketType,
  TicketSaleState,
} from "./types";

type SearchRow = Database["public"]["Functions"]["search_events"]["Returns"][number];

const pick = <T>(locale: Locale, ar: T, en: T): T => (locale === "ar" ? (ar ?? en) : (en ?? ar));
const category = (slug: string): CategorySlug => (isCategorySlug(slug) ? slug : "entertainment");

export function cardFromSearchRow(row: SearchRow, locale: Locale): EventCardData {
  let availability: EventAvailability = "available";
  if (!row.has_tickets) availability = "no_tickets";
  else if (row.seats_available <= 0) availability = "sold_out";

  return {
    id: row.id,
    slug: row.slug,
    title: pick(locale, row.title_ar, row.title_en),
    coverUrl: publicMediaUrl(row.cover_image_path),
    startsAt: row.starts_at,
    venueName: pick(locale, row.venue_name_ar, row.venue_name_en) ?? "",
    area: isAreaSlug(row.governorate) ? row.governorate : null,
    category: category(row.category_slug),
    organizerName: pick(locale, row.organizer_name_ar, row.organizer_name_en),
    minPriceFils: row.min_price_fils === null ? null : Number(row.min_price_fils),
    availability,
  };
}

/** شكل JSON الذي تُرجعه get_event_details */
export type EventDetailsJson = {
  id: string;
  slug: string;
  status: "published" | "cancelled";
  title_ar: string;
  title_en: string;
  summary_ar: string | null;
  summary_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  cover_image_path: string | null;
  venue_name_ar: string | null;
  venue_name_en: string | null;
  address_ar: string | null;
  address_en: string | null;
  governorate: string | null;
  area: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  is_online: boolean;
  starts_at: string;
  ends_at: string;
  is_featured: boolean;
  published_at: string | null;
  updated_at: string;
  cancellation_reason: string | null;
  category: { slug: string; name_ar: string; name_en: string };
  organizer: { id: string; slug: string; name_ar: string; name_en: string };
  images: { path: string; alt_ar: string | null; alt_en: string | null }[];
  ticket_types: {
    id: string;
    name_ar: string;
    name_en: string;
    description_ar: string | null;
    description_en: string | null;
    price_fils: number;
    available: number;
    quantity_total: number;
    min_per_order: number;
    max_per_order: number;
    sales_start_at: string | null;
    sales_end_at: string | null;
  }[];
};

export function ticketSaleState(
  t: { available: number; sales_start_at: string | null; sales_end_at: string | null },
  eventEndsAt: string,
  now: Date,
): TicketSaleState {
  if (t.sales_start_at && new Date(t.sales_start_at) > now) return "not_started";
  if ((t.sales_end_at && new Date(t.sales_end_at) <= now) || new Date(eventEndsAt) <= now) return "ended";
  if (t.available <= 0) return "sold_out";
  return "on_sale";
}

const toNumber = (v: number | string | null) => (v === null || v === "" ? null : Number(v));

export function detailsFromJson(
  json: EventDetailsJson,
  locale: Locale,
  areaName: (slug: string) => string,
  now = new Date(),
): EventDetails {
  const ticketTypes: PublicTicketType[] = json.ticket_types.map((t) => ({
    id: t.id,
    name: pick(locale, t.name_ar, t.name_en),
    description: pick(locale, t.description_ar, t.description_en),
    priceFils: Number(t.price_fils),
    available: t.available,
    quantityTotal: t.quantity_total,
    minPerOrder: t.min_per_order,
    maxPerOrder: t.max_per_order,
    salesStartAt: t.sales_start_at,
    salesEndAt: t.sales_end_at,
    state: ticketSaleState(t, json.ends_at, now),
  }));

  let availability: EventAvailability;
  if (json.status === "cancelled") availability = "cancelled";
  else if (new Date(json.ends_at) <= now) availability = "ended";
  else if (ticketTypes.length === 0) availability = "no_tickets";
  else if (ticketTypes.every((t) => t.state === "sold_out")) availability = "sold_out";
  else availability = "available";

  const lat = toNumber(json.latitude);
  const lng = toNumber(json.longitude);
  const area = isAreaSlug(json.governorate) ? json.governorate : null;
  const title = pick(locale, json.title_ar, json.title_en);

  return {
    id: json.id,
    slug: json.slug,
    status: json.status,
    title,
    titleAr: json.title_ar,
    titleEn: json.title_en,
    summary: pick(locale, json.summary_ar, json.summary_en),
    description: pick(locale, json.description_ar, json.description_en),
    coverUrl: publicMediaUrl(json.cover_image_path),
    images: json.images.flatMap((i) => {
      const url = publicMediaUrl(i.path);
      return url ? [{ url, alt: pick(locale, i.alt_ar, i.alt_en) ?? title }] : [];
    }),
    venueName: pick(locale, json.venue_name_ar, json.venue_name_en),
    address: pick(locale, json.address_ar, json.address_en),
    area,
    areaName: area ? areaName(area) : json.area,
    // الإحداثيات تُعرض فقط إذا كانت حقيقية ومكتملة
    latitude: lat !== null && lng !== null ? lat : null,
    longitude: lat !== null && lng !== null ? lng : null,
    isOnline: json.is_online,
    startsAt: json.starts_at,
    endsAt: json.ends_at,
    publishedAt: json.published_at,
    updatedAt: json.updated_at,
    cancellationReason: json.cancellation_reason,
    category: category(json.category.slug),
    categoryName: pick(locale, json.category.name_ar, json.category.name_en),
    organizer: {
      id: json.organizer.id,
      slug: json.organizer.slug,
      name: pick(locale, json.organizer.name_ar, json.organizer.name_en),
    },
    ticketTypes,
    availability,
    minPriceFils: ticketTypes.length ? Math.min(...ticketTypes.map((t) => t.priceFils)) : null,
  };
}
