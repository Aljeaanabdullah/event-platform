/**
 * عميل Supabase للخادم بجلسة المستخدم الحالي (Server Components / Server Actions / Route Handlers).
 * RLS تبقى مفعّلة: يرى المستخدم فقط ما تسمح به السياسات.
 * يجب إنشاء عميل جديد لكل طلب — لا تحفظه في متغير عام.
 */
import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

export async function createClient() {
  const env = publicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // يُستدعى أحيانًا من Server Component حيث لا يمكن كتابة الكوكيز؛
            // هذا آمن لأن proxy.ts يتولى تحديث الجلسة.
          }
        },
      },
    },
  );
}
