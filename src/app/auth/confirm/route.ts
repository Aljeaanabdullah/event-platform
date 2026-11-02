/**
 * تأكيد البريد/الاستعادة عبر token_hash (يعمل حتى لو فُتح الرابط في متصفح آخر).
 * يتطلب تعديل قوالب البريد في Supabase لتشير إلى:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/ar/account
 * (انظر docs/AUTH.md). بدون التعديل يعمل /auth/callback بالرابط الافتراضي.
 */
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { localeFromPath, safeRedirectPath } from "@/lib/auth/redirect";
import { publicEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

const allowedTypes: EmailOtpType[] = ["signup", "email", "recovery", "invite", "magiclink", "email_change"];

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const nextParam = params.get("next");
  const locale = localeFromPath(nextParam ?? request.cookies.get("NEXT_LOCALE")?.value ?? null);
  const origin = publicEnv().NEXT_PUBLIC_SITE_URL;

  const next = type === "recovery" ? `/${locale}/reset-password` : safeRedirectPath(nextParam, locale);

  if (tokenHash && type && allowedTypes.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, origin));
    logger.warn("auth confirm: verifyOtp failed", { code: error.code, type });
  }

  return NextResponse.redirect(new URL(`/${locale}/login?error=callback`, origin));
}
