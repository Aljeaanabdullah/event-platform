"use server";

/**
 * إجراءات المنظّم على الفعاليات (حفظ مسودة، إرسال للمراجعة، سحب، حذف).
 *
 * طبقات الحماية:
 *  1) هنا: التحقق من المدخلات (Zod) ومن أن المستخدم owner/manager في جهة معتمدة.
 *  2) قاعدة البيانات: RLS تسمح بالتعديل فقط على المسودات/المرفوضة لأعضاء الجهة،
 *     وصلاحيات الأعمدة تمنع لمس status/is_featured/عدادات التذاكر،
 *     وsubmit_event_for_review تعيد التحقق من كل الشروط.
 * لا يمكن للمنظّم تغيير حالة الاعتماد أو المبيعات أو صلاحياته من هنا إطلاقًا.
 */
import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";

import { getUserContext } from "@/lib/auth/session";
import { kuwaitLocalToIso } from "@/lib/kuwait-time";
import { logger } from "@/lib/logger";
import { parseKwdToFils } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

import {
  checkReadyForReview,
  eventFormSchema,
  slugFromTitle,
  type EventFormInput,
  type ReviewIssue,
} from "./event-schema";
import { canManage } from "./queries";

export type SaveEventResult =
  | { ok: true; eventId: string; submitted: boolean }
  | {
      ok: false;
      eventId?: string;
      error:
        | "invalidInput"
        | "sessionExpired"
        | "forbidden"
        | "notEditable"
        | "notReady"
        | "ticketLocked"
        | "generic";
      issues?: ReviewIssue[];
    };

const dbIssue: Record<string, ReviewIssue> = {
  EVENT_IN_PAST: "eventInPast",
  LOCATION_REQUIRED: "locationRequired",
  TICKETS_REQUIRED: "ticketsRequired",
};

function revalidateOrganizer() {
  revalidatePath("/[locale]/organizer", "layout");
}

export async function saveEvent(
  eventId: string | null,
  input: EventFormInput,
  options: { submit: boolean },
): Promise<SaveEventResult> {
  const parsed = eventFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalidInput" };
  const v = parsed.data;

  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "sessionExpired" };
  if (!ctx.memberships.some((m) => m.organizerId === v.organizerId && canManage(m))) {
    return { ok: false, error: "forbidden" };
  }
  // الصور يجب أن تكون داخل مجلد الجهة نفسها
  const paths = [v.coverPath, ...v.gallery].filter((p): p is string => p !== null);
  if (paths.some((p) => !p.startsWith(`${v.organizerId}/`))) return { ok: false, error: "invalidInput" };

  if (options.submit) {
    const issues = checkReadyForReview(v);
    if (issues.length) return { ok: false, error: "notReady", issues, eventId: eventId ?? undefined };
  }

  const supabase = await createClient();
  const { data: category } = await supabase
    .from("event_categories")
    .select("id")
    .eq("slug", v.categorySlug)
    .single();
  if (!category) return { ok: false, error: "invalidInput" };

  const row = {
    category_id: category.id,
    title_ar: v.titleAr,
    title_en: v.titleEn,
    summary_ar: v.summaryAr || null,
    summary_en: v.summaryEn || null,
    description_ar: v.descriptionAr || null,
    description_en: v.descriptionEn || null,
    cover_image_path: v.coverPath,
    is_online: v.isOnline,
    venue_name_ar: v.isOnline ? null : v.venueNameAr || null,
    venue_name_en: v.isOnline ? null : v.venueNameEn || null,
    address_ar: v.isOnline ? null : v.addressAr || null,
    address_en: v.isOnline ? null : v.addressEn || null,
    governorate: v.isOnline || v.governorate === "" ? null : v.governorate,
    area: v.isOnline ? null : v.area || null,
    latitude: v.isOnline || v.latitude === "" ? null : Number(v.latitude),
    longitude: v.isOnline || v.longitude === "" ? null : Number(v.longitude),
    starts_at: kuwaitLocalToIso(v.startsAtLocal)!,
    ends_at: kuwaitLocalToIso(v.endsAtLocal)!,
  };

  let id = eventId;
  if (id) {
    const { data, error } = await supabase.from("events").update(row).eq("id", id).select("id").maybeSingle();
    if (error || !data) {
      if (error) logger.error("update event failed", error, { code: error.code });
      return { ok: false, error: "notEditable", eventId: id };
    }
  } else {
    const { data, error } = await supabase
      .from("events")
      .insert({
        ...row,
        organizer_id: v.organizerId,
        created_by: ctx.userId,
        slug: slugFromTitle(v.titleEn, randomBytes(3).toString("hex")),
      })
      .select("id")
      .single();
    if (error || !data) {
      logger.error("create event failed", error, { code: error?.code });
      return { ok: false, error: "generic" };
    }
    id = data.id;
  }

  // مزامنة أنواع التذاكر: تعديل الموجود، إضافة الجديد، حذف المحذوف (إن لم تكن عليه مبيعات)
  const { data: existing } = await supabase
    .from("ticket_types")
    .select("id, quantity_sold, quantity_reserved")
    .eq("event_id", id);
  const keep = new Set(v.tickets.map((t) => t.id).filter(Boolean));
  const removed = (existing ?? []).filter((t) => !keep.has(t.id));
  if (removed.some((t) => t.quantity_sold + t.quantity_reserved > 0)) {
    return { ok: false, error: "ticketLocked", eventId: id };
  }
  if (removed.length) {
    const { error } = await supabase
      .from("ticket_types")
      .delete()
      .in(
        "id",
        removed.map((t) => t.id),
      );
    if (error) {
      logger.error("delete ticket types failed", error, { code: error.code });
      return { ok: false, error: "generic", eventId: id };
    }
  }
  const existingIds = new Set((existing ?? []).map((t) => t.id));
  for (const [index, t] of v.tickets.entries()) {
    const ticket = {
      name_ar: t.nameAr,
      name_en: t.nameEn,
      price_fils: parseKwdToFils(t.price),
      quantity_total: t.quantity,
      max_per_order: t.maxPerOrder,
      sort_order: index,
    };
    const { error } =
      t.id && existingIds.has(t.id)
        ? await supabase.from("ticket_types").update(ticket).eq("id", t.id).eq("event_id", id)
        : await supabase.from("ticket_types").insert({ ...ticket, event_id: id });
    if (error) {
      logger.error("save ticket type failed", error, { code: error.code });
      // 23514 = check_violation (مثل كمية أقل من المباع)
      return { ok: false, error: error.code === "23514" ? "ticketLocked" : "generic", eventId: id };
    }
  }

  // معرض الصور: نستبدل القائمة كاملة بنفس الترتيب
  await supabase.from("event_images").delete().eq("event_id", id);
  if (v.gallery.length) {
    const { error } = await supabase
      .from("event_images")
      .insert(v.gallery.map((path, i) => ({ event_id: id!, storage_path: path, sort_order: i })));
    if (error) {
      logger.error("save gallery failed", error, { code: error.code });
      return { ok: false, error: "generic", eventId: id };
    }
  }

  if (options.submit) {
    const { error } = await supabase.rpc("submit_event_for_review", { p_event_id: id });
    if (error) {
      const issue = dbIssue[error.message];
      revalidateOrganizer();
      if (issue) return { ok: false, error: "notReady", issues: [issue], eventId: id };
      logger.error("submit for review failed", error, { code: error.code });
      return {
        ok: false,
        error: error.message === "INVALID_STATUS" ? "notEditable" : "generic",
        eventId: id,
      };
    }
  }

  revalidateOrganizer();
  return { ok: true, eventId: id, submitted: options.submit };
}

export type SimpleResult = { ok: true } | { ok: false; error: "sessionExpired" | "notAllowed" | "generic" };

/** سحب الطلب من المراجعة وإعادته مسودة */
export async function withdrawSubmission(eventId: string): Promise<SimpleResult> {
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "sessionExpired" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("withdraw_event_submission", { p_event_id: eventId });
  if (error) {
    logger.warn("withdraw submission failed", { code: error.code, message: error.message });
    return { ok: false, error: "notAllowed" };
  }
  revalidateOrganizer();
  return { ok: true };
}

/** حذف مسودة (RLS: مسودات الجهة فقط) */
export async function deleteDraft(eventId: string): Promise<SimpleResult> {
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "sessionExpired" };
  const supabase = await createClient();
  const { data, error } = await supabase.from("events").delete().eq("id", eventId).select("id");
  if (error || !data?.length) {
    if (error) logger.warn("delete draft failed", { code: error.code });
    return { ok: false, error: "notAllowed" };
  }
  revalidateOrganizer();
  return { ok: true };
}
