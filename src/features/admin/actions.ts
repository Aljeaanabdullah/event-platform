"use server";

/**
 * إجراءات المدير: مراجعة الفعاليات وطلبات المنظّمين.
 * التحقق من الدور هنا (getUserContext) ثم مرة أخرى داخل الدوال في قاعدة البيانات (is_admin).
 * كل تغيير حالة يُسجَّل تلقائيًا في audit_logs عبر Triggers (لا يمكن تعديلها أو حذفها).
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getUserContext } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export type AdminActionResult =
  | { ok: true }
  | { ok: false; error: "forbidden" | "reasonRequired" | "notFound" | "invalidInput" | "generic" };

const reviewSchema = z.object({
  eventId: z.uuid(),
  approve: z.boolean(),
  reason: z.string().trim().max(1000).optional(),
});

export async function reviewEvent(input: z.input<typeof reviewSchema>): Promise<AdminActionResult> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalidInput" };
  const { eventId, approve, reason } = parsed.data;
  if (!approve && !reason) return { ok: false, error: "reasonRequired" };

  const ctx = await getUserContext();
  if (!ctx?.isAdmin) return { ok: false, error: "forbidden" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("review_event", {
    p_event_id: eventId,
    p_approve: approve,
    p_reason: approve ? undefined : reason,
  });
  if (error) {
    if (error.message === "FORBIDDEN") return { ok: false, error: "forbidden" };
    if (error.message === "REASON_REQUIRED") return { ok: false, error: "reasonRequired" };
    if (error.code === "P0002") return { ok: false, error: "notFound" };
    logger.error("review event failed", error, { code: error.code });
    return { ok: false, error: "generic" };
  }
  revalidatePath("/[locale]/admin", "layout");
  revalidatePath("/[locale]/events", "layout");
  return { ok: true };
}

const organizerSchema = z.object({
  organizerId: z.uuid(),
  status: z.enum(["approved", "rejected", "suspended"]),
  reason: z.string().trim().max(1000).optional(),
});

export async function setOrganizerStatus(input: z.input<typeof organizerSchema>): Promise<AdminActionResult> {
  const parsed = organizerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalidInput" };
  const { organizerId, status, reason } = parsed.data;
  if (status !== "approved" && !reason) return { ok: false, error: "reasonRequired" };

  const ctx = await getUserContext();
  if (!ctx?.isAdmin) return { ok: false, error: "forbidden" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_organizer_status", {
    p_organizer_id: organizerId,
    p_status: status,
    p_reason: status === "approved" ? undefined : reason,
  });
  if (error) {
    if (error.message === "FORBIDDEN") return { ok: false, error: "forbidden" };
    if (error.message === "REASON_REQUIRED") return { ok: false, error: "reasonRequired" };
    if (error.code === "P0002") return { ok: false, error: "notFound" };
    logger.error("set organizer status failed", error, { code: error.code });
    return { ok: false, error: "generic" };
  }
  revalidatePath("/[locale]/admin", "layout");
  return { ok: true };
}
