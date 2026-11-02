/**
 * Rate limiting للعمليات الحساسة (الدخول، التسجيل، استعادة كلمة المرور…)
 * يعتمد على دالة check_rate_limit في Postgres (نافذة زمنية ثابتة).
 *
 * يحتاج SUPABASE_SECRET_KEY. إذا لم يُضبط:
 *   - في التطوير: نسمح بالطلب مع تحذير (حتى لا يتعطل العمل المحلي).
 *   - في الإنتاج: نرفض الطلب (fail closed) — الأمان أولًا.
 * ملاحظة: Supabase Auth يطبّق حدودًا إضافية خاصة به على إرسال البريد والتسجيل.
 */
import "server-only";

import { headers } from "next/headers";

import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

export type RateLimitRule = { limit: number; windowSeconds: number };

export const RATE_LIMITS = {
  login: { limit: 10, windowSeconds: 10 * 60 },
  register: { limit: 5, windowSeconds: 60 * 60 },
  passwordReset: { limit: 5, windowSeconds: 60 * 60 },
  oauth: { limit: 20, windowSeconds: 10 * 60 },
  profileUpdate: { limit: 30, windowSeconds: 10 * 60 },
  organizerApply: { limit: 5, windowSeconds: 60 * 60 },
} satisfies Record<string, RateLimitRule>;

export async function clientIp(): Promise<string> {
  const h = await headers();
  // Vercel/الوكلاء: أول عنوان في x-forwarded-for هو عنوان العميل
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

let warned = false;

/** يُرجع true إذا كان الطلب مسموحًا */
export async function rateLimit(action: keyof typeof RATE_LIMITS, identifier: string): Promise<boolean> {
  const rule = RATE_LIMITS[action];
  if (!process.env.SUPABASE_SECRET_KEY) {
    // E2E_ALLOW_NO_RATE_LIMIT يُضبط فقط داخل playwright.config عند غياب المفتاح — لا يُضبط أبدًا في النشر
    if (process.env.NODE_ENV === "production" && process.env.E2E_ALLOW_NO_RATE_LIMIT !== "1") {
      logger.error("rate limit unavailable: SUPABASE_SECRET_KEY missing", undefined, { action });
      return false;
    }
    if (!warned) {
      logger.warn("rate limiting disabled in development: SUPABASE_SECRET_KEY not set");
      warned = true;
    }
    return true;
  }

  try {
    const { data, error } = await createAdminClient().rpc("check_rate_limit", {
      p_key: `${action}:${identifier}`.slice(0, 200),
      p_limit: rule.limit,
      p_window_seconds: rule.windowSeconds,
    });
    if (error) throw error;
    return data === true;
  } catch (error) {
    logger.error("rate limit check failed", error, { action });
    return process.env.NODE_ENV !== "production";
  }
}
