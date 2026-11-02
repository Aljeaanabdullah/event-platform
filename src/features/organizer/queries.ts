import "server-only";

import { notFound } from "next/navigation";

import type { Membership, UserContext } from "@/lib/auth/session";
import { isoToKuwaitLocal } from "@/lib/kuwait-time";
import { logger } from "@/lib/logger";
import { filsToKwdString } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

import type { EventFormInput } from "./event-schema";

type EventStatus = Database["public"]["Enums"]["event_status"];

export const canManage = (m: Membership) =>
  m.status === "approved" && (m.role === "owner" || m.role === "manager");

/** الجهة المختارة (من ?org=) أو أول جهة معتمدة يديرها المستخدم */
export function pickOrganizer(user: UserContext, orgParam?: string | string[]): Membership | null {
  const managed = user.memberships.filter(canManage);
  const wanted = typeof orgParam === "string" ? orgParam : undefined;
  return managed.find((m) => m.organizerId === wanted) ?? managed[0] ?? null;
}

export type OrganizerDashboard = {
  events_total: number;
  events_published: number;
  events_pending: number;
  events_draft: number;
  events_upcoming: number;
  orders_paid: number;
  gross_fils: number;
  commission_fils: number;
  net_fils: number;
  refunded_fils: number;
  tickets_sold: number;
  checked_in: number;
};

/** الأرقام من قاعدة البيانات مباشرة — الدالة ترفض غير الأعضاء (FORBIDDEN) */
export async function getOrganizerDashboard(organizerId: string): Promise<OrganizerDashboard | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_organizer_dashboard", { p_organizer_id: organizerId });
  if (error) {
    logger.error("organizer dashboard failed", error, { code: error.code });
    return null;
  }
  return data as unknown as OrganizerDashboard;
}

export type EventSalesRow = Database["public"]["Functions"]["get_organizer_event_sales"]["Returns"][number];

export async function getOrganizerEventSales(organizerId: string): Promise<EventSalesRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_organizer_event_sales", { p_organizer_id: organizerId });
  if (error) {
    logger.error("organizer event sales failed", error, { code: error.code });
    return [];
  }
  return data;
}

export type EditableEvent = {
  id: string;
  slug: string;
  status: EventStatus;
  rejectionReason: string | null;
  organizerId: string;
  values: EventFormInput;
  /** أنواع تذاكر لها مبيعات/حجوزات لا يمكن حذفها */
  lockedTicketIds: string[];
};

/** فعالية للمنظّم (RLS: أعضاء الجهة أو المدير فقط) — 404 لغير ذلك */
export async function getEventForOrganizer(eventId: string): Promise<EditableEvent> {
  if (!/^[0-9a-f-]{36}$/.test(eventId)) notFound();
  const supabase = await createClient();
  const { data: e, error } = await supabase
    .from("events")
    .select(
      "id, slug, status, rejection_reason, organizer_id, title_ar, title_en, summary_ar, summary_en, description_ar, description_en, cover_image_path, venue_name_ar, venue_name_en, address_ar, address_en, governorate, area, latitude, longitude, is_online, starts_at, ends_at, event_categories (slug), ticket_types (id, name_ar, name_en, price_fils, quantity_total, quantity_sold, quantity_reserved, max_per_order, sort_order), event_images (storage_path, sort_order)",
    )
    .eq("id", eventId)
    .maybeSingle();
  if (error) logger.error("load event for organizer failed", error, { code: error.code });
  if (!e) notFound();

  const tickets = [...e.ticket_types].sort((a, b) => a.sort_order - b.sort_order);
  return {
    id: e.id,
    slug: e.slug,
    status: e.status,
    rejectionReason: e.rejection_reason,
    organizerId: e.organizer_id,
    lockedTicketIds: tickets.filter((t) => t.quantity_sold + t.quantity_reserved > 0).map((t) => t.id),
    values: {
      organizerId: e.organizer_id,
      categorySlug: (e.event_categories?.slug ?? "conferences") as EventFormInput["categorySlug"],
      titleAr: e.title_ar,
      titleEn: e.title_en,
      summaryAr: e.summary_ar ?? "",
      summaryEn: e.summary_en ?? "",
      descriptionAr: e.description_ar ?? "",
      descriptionEn: e.description_en ?? "",
      coverPath: e.cover_image_path,
      gallery: [...e.event_images].sort((a, b) => a.sort_order - b.sort_order).map((i) => i.storage_path),
      startsAtLocal: isoToKuwaitLocal(e.starts_at),
      endsAtLocal: isoToKuwaitLocal(e.ends_at),
      isOnline: e.is_online,
      venueNameAr: e.venue_name_ar ?? "",
      venueNameEn: e.venue_name_en ?? "",
      addressAr: e.address_ar ?? "",
      addressEn: e.address_en ?? "",
      governorate: e.governorate ?? "",
      area: e.area ?? "",
      latitude: e.latitude === null ? "" : String(e.latitude),
      longitude: e.longitude === null ? "" : String(e.longitude),
      tickets: tickets.map((t) => ({
        id: t.id,
        nameAr: t.name_ar,
        nameEn: t.name_en,
        price: filsToKwdString(t.price_fils),
        quantity: t.quantity_total,
        maxPerOrder: t.max_per_order,
      })),
    },
  };
}
