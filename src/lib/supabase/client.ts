/**
 * عميل Supabase للمتصفح (Client Components).
 * يستخدم المفتاح العام فقط، وكل الصلاحيات تفرضها سياسات RLS في قاعدة البيانات.
 */
import { createBrowserClient } from "@supabase/ssr";

import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

export function createClient() {
  const env = publicEnv();
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
