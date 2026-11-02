/**
 * تحديث جلسة Supabase داخل proxy.ts لكل طلب.
 * (نمط التوثيق الرسمي لـ @supabase/ssr مع Next.js 16)
 *
 * - يقرأ الكوكيز من الطلب، ويجدد التوكن إذا قارب على الانتهاء.
 * - يكتب الكوكيز المحدّثة على الطلب نفسه (لتراها Server Components في نفس الطلب)
 *   ويُرجعها لتُضاف إلى الاستجابة النهائية.
 * - getClaims() يتحقق من توقيع الـ JWT — لا نثق بالكوكيز دون تحقق.
 */
import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";

import type { Database } from "@/types/database";

type CookieToSet = { name: string; value: string; options: Record<string, unknown> };

export async function refreshSession(request: NextRequest) {
  const cookiesToSet: CookieToSet[] = [];
  const headers: Record<string, string> = {};

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookies, cacheHeaders) {
          cookies.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            cookiesToSet.push({ name, value, options });
          });
          // ترويسات تمنع تخزين الاستجابة التي تحمل كوكيز الجلسة في الـ CDN
          Object.assign(headers, cacheHeaders);
        },
      },
    },
  );

  // لا تضع أي كود بين إنشاء العميل و getClaims (توصية Supabase)
  const { data } = await supabase.auth.getClaims();

  return { userId: (data?.claims?.sub as string | undefined) ?? null, cookiesToSet, headers };
}
