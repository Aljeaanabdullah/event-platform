import type { AreaSlug, CategorySlug } from "@/config/site";

/** حالة التذاكر كما تظهر للزائر */
export type EventAvailability = "available" | "sold_out" | "cancelled" | "ended" | "no_tickets";

/** البيانات اللازمة لعرض بطاقة فعالية — النصوص مُختارة مسبقًا حسب لغة الصفحة */
export type EventCardData = {
  id: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  startsAt: string; // ISO
  venueName: string;
  area: AreaSlug | null;
  category: CategorySlug;
  organizerName: string;
  /** أقل سعر تذكرة بالفلس؛ null إذا لا توجد تذاكر */
  minPriceFils: number | null;
  availability: EventAvailability;
};

export type HomeSections = {
  featured: EventCardData[];
  thisWeek: EventCardData[];
  weekend: EventCardData[];
  free: EventCardData[];
  upcoming: EventCardData[];
  popular: EventCardData[];
};

export type EventSearchResult = {
  events: EventCardData[];
  total: number;
  page: number;
  pageCount: number;
};

/** حالة بيع نوع تذكرة (تُحسب من التواريخ والكمية في قاعدة البيانات) */
export type TicketSaleState = "on_sale" | "sold_out" | "not_started" | "ended";

export type PublicTicketType = {
  id: string;
  name: string;
  description: string | null;
  priceFils: number;
  available: number;
  quantityTotal: number;
  minPerOrder: number;
  maxPerOrder: number;
  salesStartAt: string | null;
  salesEndAt: string | null;
  state: TicketSaleState;
};

export type EventDetails = {
  id: string;
  slug: string;
  status: "published" | "cancelled";
  title: string;
  titleAr: string;
  titleEn: string;
  summary: string | null;
  description: string | null;
  coverUrl: string | null;
  images: { url: string; alt: string }[];
  venueName: string | null;
  address: string | null;
  area: AreaSlug | null;
  areaName: string | null;
  latitude: number | null;
  longitude: number | null;
  isOnline: boolean;
  startsAt: string;
  endsAt: string;
  publishedAt: string | null;
  updatedAt: string;
  cancellationReason: string | null;
  category: CategorySlug;
  categoryName: string;
  organizer: { id: string; slug: string; name: string };
  ticketTypes: PublicTicketType[];
  availability: EventAvailability;
  minPriceFils: number | null;
};
