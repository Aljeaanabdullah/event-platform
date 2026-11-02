"use server";

/**
 * طلب الانضمام كمنظّم. يُنشئ جهة بحالة "قيد المراجعة" ويجعل المستخدم مالكها.
 * لا يمنح أي صلاحية نشر حتى يعتمدها المدير (يُفرض ذلك في قاعدة البيانات).
 */
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

import { organizerApplicationSchema, type OrganizerApplicationInput } from "./schemas";

export type ApplyResult =
  | { ok: true }
  | {
      ok: false;
      error: "invalidInput" | "sessionExpired" | "slugTaken" | "tooManyPending" | "rateLimited" | "generic";
    };

export async function applyAsOrganizer(input: OrganizerApplicationInput): Promise<ApplyResult> {
  const parsed = organizerApplicationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalidInput" };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { ok: false, error: "sessionExpired" };
  if (!(await rateLimit("organizerApply", userId))) return { ok: false, error: "rateLimited" };

  const d = parsed.data;
  const { error } = await supabase.rpc("apply_as_organizer", {
    p_slug: d.slug,
    p_name_ar: d.nameAr,
    p_name_en: d.nameEn,
    p_contact_email: d.contactEmail,
    p_contact_phone: d.contactPhone || undefined,
    p_website_url: d.websiteUrl || undefined,
    p_commercial_reg_no: d.commercialRegNo || undefined,
    p_description_ar: d.descriptionAr || undefined,
    p_description_en: d.descriptionEn || undefined,
  });

  if (error) {
    if (error.code === "23505") return { ok: false, error: "slugTaken" };
    if (error.message === "TOO_MANY_PENDING_APPLICATIONS") return { ok: false, error: "tooManyPending" };
    logger.error("organizer application failed", error);
    return { ok: false, error: "generic" };
  }
  return { ok: true };
}
