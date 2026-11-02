import "server-only";

import { notFound } from "next/navigation";
import QRCode from "qrcode";

import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f-]{36}$/;

/** طلب المستخدم الحالي (RLS: المشتري أو منظّم الفعالية أو المدير) — نقيّده هنا بالمشتري فقط */
export async function getMyOrder(orderId: string, userId: string) {
  if (!UUID.test(orderId)) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, subtotal_fils, service_fee_fils, total_fils, platform_commission_fils, currency, expires_at, paid_at, created_at, user_id, events (id, slug, title_ar, title_en, starts_at, venue_name_ar, venue_name_en), order_items (id, quantity, unit_price_fils, line_total_fils, ticket_name_ar, ticket_name_en), payments (id, provider, status, amount_fils, failure_reason, created_at)",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (error) logger.error("load order failed", error, { code: error.code });
  if (!data || data.user_id !== userId) notFound();
  return data;
}

export type MyOrder = Awaited<ReturnType<typeof getMyOrder>>;

export async function listMyOrders(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, total_fils, expires_at, created_at, events (slug, title_ar, title_en, starts_at)",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

/** تذاكري: RLS تعيد تذاكر المالك (وتذاكر فعاليات جهاته إن كان منظّمًا) — نقيّد بالمالك */
export async function listMyTickets(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tickets")
    .select(
      "id, code, status, checked_in_at, created_at, events (slug, title_ar, title_en, starts_at, ends_at, venue_name_ar, venue_name_en, cover_image_path), ticket_types (name_ar, name_en)",
    )
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);
  return data ?? [];
}

export async function getMyTicket(ticketId: string, userId: string) {
  if (!UUID.test(ticketId)) notFound();
  const supabase = await createClient();
  const { data } = await supabase
    .from("tickets")
    .select(
      "id, code, status, checked_in_at, voided_at, void_reason, owner_user_id, order_id, events (slug, title_ar, title_en, starts_at, ends_at, venue_name_ar, venue_name_en, address_ar, address_en, governorate, is_online), ticket_types (name_ar, name_en, price_fils), orders (order_number)",
    )
    .eq("id", ticketId)
    .maybeSingle();
  if (!data || data.owner_user_id !== userId) notFound();
  return data;
}

/**
 * رمز QR كصورة SVG — يُولَّد على الخادم من رمز سري لا يُعطى إلا لمالك التذكرة
 * (get_ticket_qr_token تتحقق من الملكية). التذاكر الملغاة لا رمز لها.
 */
export async function getTicketQrSvg(ticketId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: token, error } = await supabase.rpc("get_ticket_qr_token", { p_ticket_id: ticketId });
  if (error || !token) return null;
  return QRCode.toString(token, { type: "svg", errorCorrectionLevel: "M", margin: 1, width: 280 });
}
