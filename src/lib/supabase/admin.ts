/**
 * عميل Supabase بالمفتاح السري — يتجاوز RLS بالكامل.
 *
 * ⚠️ للاستخدام فقط في: Webhooks الدفع، والمهام الإدارية على الخادم بعد التحقق من الصلاحية.
 * لا تستخدمه أبدًا لتنفيذ طلب مستخدم دون التحقق من هويته وصلاحيته أولًا.
 */
import "server-only";

import { createClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

export function createAdminClient() {
  return createClient(publicEnv().NEXT_PUBLIC_SUPABASE_URL, serverEnv().SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
