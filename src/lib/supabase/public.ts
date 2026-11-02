/**
 * عميل Supabase "عام" للخادم بدون كوكيز — لقراءة بيانات عامة في الصفحات الثابتة (Static/ISR)
 * دون تحويلها لصفحات ديناميكية. يعمل بصلاحيات الزائر (anon) فقط، و RLS مفعّلة.
 * يُرجع null إذا لم تُضبط متغيرات البيئة (مثلًا أثناء البناء في CI) بدل إسقاط الصفحة.
 */
import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
