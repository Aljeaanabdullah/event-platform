import "server-only";

import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

/** الفعاليات حسب حالة المراجعة (RLS: المدير يرى كل الفعاليات) */
export async function listEventsForReview(status: "pending_review" | "rejected" | "published") {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, slug, status, title_ar, title_en, summary_ar, summary_en, description_ar, description_en, starts_at, ends_at, submitted_at, reviewed_at, rejection_reason, is_online, venue_name_ar, venue_name_en, governorate, organizers (name_ar, name_en, is_test), event_categories (slug), ticket_types (name_ar, name_en, price_fils, quantity_total)",
    )
    .eq("status", status)
    .order(status === "pending_review" ? "submitted_at" : "reviewed_at", {
      ascending: status === "pending_review",
    })
    .limit(50);
  if (error) logger.error("list events for review failed", error, { code: error.code });
  return data ?? [];
}

export async function listOrganizerApplications() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizers")
    .select(
      "id, slug, name_ar, name_en, contact_email, contact_phone, website_url, commercial_reg_no, description_ar, description_en, status, created_at, rejection_reason, is_test",
    )
    .in("status", ["pending", "approved", "rejected", "suspended"])
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) logger.error("list organizers failed", error, { code: error.code });
  return data ?? [];
}

/** آخر إجراءات المراجعة من سجل التدقيق (للمتابعة) */
export async function recentReviewAudit() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, created_at, after")
    .in("entity_type", ["events", "organizers"])
    .order("created_at", { ascending: false })
    .limit(15);
  return data ?? [];
}
