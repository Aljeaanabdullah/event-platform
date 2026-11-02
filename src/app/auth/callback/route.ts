/**
 * نقطة العودة بعد Google OAuth، ورابط تفعيل البريد، ورابط استعادة كلمة المرور.
 * يستبدل الرمز (code) بجلسة (PKCE)، ثم يحوّل لمسار داخلي آمن فقط.
 */
import { NextResponse, type NextRequest } from "next/server";

import { localeFromPath, safeRedirectPath } from "@/lib/auth/redirect";
import { publicEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const nextParam = params.get("next");
  const locale = localeFromPath(nextParam ?? request.cookies.get("NEXT_LOCALE")?.value ?? null);
  const next = safeRedirectPath(nextParam, locale);
  // نستخدم عنوان الموقع المضبوط بدل ترويسة Host لتفادي التلاعب بها
  const origin = publicEnv().NEXT_PUBLIC_SITE_URL;

  const code = params.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
    logger.warn("auth callback: code exchange failed", { code: error.code });
  } else if (params.get("error")) {
    // رفض المستخدم الإذن في Google أو خطأ من المزوّد
    logger.warn("auth callback: provider error", { error: params.get("error") });
  }

  return NextResponse.redirect(new URL(`/${locale}/login?error=callback`, origin));
}
