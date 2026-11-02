"use server";

/**
 * التحقق من التذكرة عند الدخول. كل القرار في قاعدة البيانات (check_in_ticket):
 *  - تحديث ذري: status='valid' → 'checked_in' مرة واحدة فقط (المسح الثاني = already_used).
 *  - يتحقق أن الموظف عضو في الجهة المنظّمة للفعالية، وإلا يُرجع "invalid" دون كشف وجود التذكرة.
 *  - التذاكر الملغاة = void، وتذكرة فعالية أخرى = wrong_event.
 */
import { z } from "zod";

import { classifyScan } from "@/features/booking/schema";
import { getUserId } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export type CheckInResult = {
  result: "ok" | "already_used" | "void" | "wrong_event" | "invalid" | "error";
  code?: string;
  ticketTypeAr?: string;
  ticketTypeEn?: string;
  eventTitleAr?: string;
  eventTitleEn?: string;
  checkedInAt?: string;
};

const inputSchema = z.object({ value: z.string().max(200), eventId: z.uuid().nullable() });

export async function checkInTicket(input: z.input<typeof inputSchema>): Promise<CheckInResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { result: "invalid" };
  if (!(await getUserId())) return { result: "error" };
  const scan = classifyScan(parsed.data.value);
  if (!scan) return { result: "invalid" };

  const supabase = await createClient();
  const eventId = parsed.data.eventId ?? undefined;
  const { data, error } =
    scan.kind === "token"
      ? await supabase.rpc("check_in_ticket", { p_qr_token: scan.value, p_event_id: eventId })
      : await supabase.rpc("check_in_ticket_code", { p_code: scan.value, p_event_id: eventId });
  if (error || !data) {
    logger.error("check-in failed", error, { code: error?.code });
    return { result: "error" };
  }
  const r = data as Record<string, string>;
  return {
    result: r.result as CheckInResult["result"],
    code: r.code,
    ticketTypeAr: r.ticket_type_ar,
    ticketTypeEn: r.ticket_type_en,
    eventTitleAr: r.event_title_ar,
    eventTitleEn: r.event_title_en,
    checkedInAt: r.checked_in_at,
  };
}
