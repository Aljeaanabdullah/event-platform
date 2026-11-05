"use server";

/**
 * الحجز: نستخدم دوال Phase 3 كما هي (لا نعيد بناء المنطق):
 *  - reserve_tickets: قفل صفوف أنواع التذاكر (FOR UPDATE بترتيب ثابت)، فحص المتاح، حساب الإجمالي
 *    بالفلس على الخادم، حجز مؤقت 15 دقيقة، وتأكيد فوري للطلبات المجانية.
 *  - cancel_pending_order: إلغاء طلب معلّق يحرر الكمية فورًا.
 * الواجهة ترسل المعرّفات والكميات فقط — أي سعر من المتصفح يُتجاهل.
 */
import { revalidatePath } from "next/cache";

import { routing, type Locale } from "@/i18n/routing";
import { getUserId } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

import { mapReserveError, reserveSchema, type ReserveError, type ReserveInput } from "./schema";

export type ReserveResult =
  { ok: true; orderId: string; status: "paid" | "pending_payment" } | { ok: false; error: ReserveError };

export async function reserveTickets(input: ReserveInput, locale: Locale): Promise<ReserveResult> {
  const parsed = reserveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalidItems" };
  if (!(await getUserId())) return { ok: false, error: "authRequired" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reserve_tickets", {
    p_event_id: parsed.data.eventId,
    p_items: parsed.data.items.map((i) => ({ ticket_type_id: i.ticketTypeId, quantity: i.quantity })),
    p_locale: routing.locales.includes(locale) ? locale : "ar",
  });
  if (error || !data?.[0]) {
    const mapped = mapReserveError(error?.message);
    if (mapped === "generic") logger.error("reserve_tickets failed", error, { code: error?.code });
    return { ok: false, error: mapped };
  }

  const order = data[0];
  revalidatePath("/[locale]/events/[slug]", "page");
  return { ok: true, orderId: order.order_id, status: order.status === "paid" ? "paid" : "pending_payment" };
}

export async function cancelPendingOrder(orderId: string): Promise<{ ok: boolean }> {
  if (!/^[0-9a-f-]{36}$/.test(orderId) || !(await getUserId())) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_pending_order", { p_order_id: orderId });
  if (error) {
    logger.warn("cancel order failed", { code: error.code });
    return { ok: false };
  }
  revalidatePath("/[locale]/account", "layout");
  return { ok: true };
}
