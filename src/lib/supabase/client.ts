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

let browserClient: ReturnType<typeof createClient> | undefined;

/**
 * عميل المتصفح المشترك — يُنشأ عند أول استخدام فقط.
 * يجب استدعاؤه داخل effects أو معالجات الأحداث، وليس أثناء الرسم:
 * الرسم يحدث أيضًا على الخادم وقت البناء، حيث قد لا تكون متغيرات البيئة متاحة.
 */
export function getBrowserClient(): ReturnType<typeof createClient> | null {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return null;
  browserClient ??= createClient();
  return browserClient;
}
