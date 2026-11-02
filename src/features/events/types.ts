import type { AreaSlug, CategorySlug } from "@/config/site";

/** حالة التذاكر كما تظهر للزائر */
export type EventAvailability = "available" | "sold_out" | "cancelled" | "ended";

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
