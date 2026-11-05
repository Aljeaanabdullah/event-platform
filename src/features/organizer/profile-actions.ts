"use server";

/**
 * تحديث شعار الجهة المنظِّمة.
 * طبقات الحماية: هنا (owner/manager في جهة معتمدة + المسار داخل مجلد الجهة)،
 * ثم RLS على organizers (owner/manager أو المدير) وصلاحية العمود logo_path فقط.
 */
import { revalidatePath } from "next/cache";

import { getUserContext } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

import { isOwnLogoPath } from "./logo";
import { canManage } from "./queries";

export type LogoResult =
  { ok: true } | { ok: false; error: "sessionExpired" | "forbidden" | "invalidPath" | "generic" };

export async function updateOrganizerLogo(organizerId: string, path: string | null): Promise<LogoResult> {
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "sessionExpired" };
  const membership = ctx.memberships.find((m) => m.organizerId === organizerId);
  if (!membership || !canManage(membership)) return { ok: false, error: "forbidden" };
  if (path !== null && !isOwnLogoPath(organizerId, path)) return { ok: false, error: "invalidPath" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizers")
    .update({ logo_path: path })
    .eq("id", organizerId)
    .select("id");
  if (error || !data?.length) {
    if (error) logger.warn("update organizer logo failed", { code: error.code });
    return { ok: false, error: error ? "generic" : "forbidden" };
  }
  revalidatePath("/[locale]/organizer", "layout");
  return { ok: true };
}
