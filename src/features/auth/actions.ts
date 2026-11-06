"use server";

/**
 * عمليات المصادقة على الخادم (Server Actions).
 * - كل مدخل يُعاد التحقق منه بـ Zod هنا حتى لو تحقق منه المتصفح.
 * - Rate limiting لكل عملية حساسة (حسب IP، وحسب البريد عند توفره).
 * - Server Actions في Next.js محمية من CSRF (تتحقق من Origin تلقائيًا).
 * - الرسائل للمستخدم رموز ثابتة؛ لا نكشف وجود حساب من عدمه.
 */
import { redirect } from "next/navigation";

import type { Locale } from "@/i18n/routing";
import { safeRedirectPath } from "@/lib/auth/redirect";
import { publicEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

import { mapAuthError, type ActionResult } from "./errors";
import {
  forgotPasswordSchema,
  loginSchema,
  profileSchema,
  registerSchema,
  resetPasswordSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type ProfileInput,
  type RegisterInput,
  type ResetPasswordInput,
} from "./schemas";

const asLocale = (l: string): Locale => (l === "en" ? "en" : "ar");
const callbackUrl = (next: string) =>
  `${publicEnv().NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`;

// ---------------------------------------------------------------------
// الدخول بالبريد وكلمة المرور
// ---------------------------------------------------------------------
export async function signInWithPassword(
  input: LoginInput,
  locale: string,
  next: string | null,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalidInput" };

  const ip = await clientIp();
  if (!(await rateLimit("login", ip)) || !(await rateLimit("login", parsed.data.email))) {
    return { ok: false, error: "rateLimited" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, error: mapAuthError(error) };

  redirect(safeRedirectPath(next, asLocale(locale)));
}

// ---------------------------------------------------------------------
// إنشاء حساب — الدور دائمًا "عميل"؛ نوع الحساب المختار مجرد نية تُوجّه المستخدم بعد التأكيد
// ---------------------------------------------------------------------
export async function signUp(
  input: RegisterInput,
  locale: string,
): Promise<ActionResult<{ needsConfirmation: boolean }>> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalidInput" };

  const lang = asLocale(locale);
  if (!(await rateLimit("register", await clientIp()))) return { ok: false, error: "rateLimited" };

  const next = parsed.data.accountType === "organizer" ? `/${lang}/organizer/apply` : `/${lang}`;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: callbackUrl(next),
      data: { full_name: parsed.data.fullName, locale: lang, account_type: parsed.data.accountType },
    },
  });

  // ملاحظة: إذا كان البريد مسجلًا مسبقًا، يُرجع Supabase نجاحًا شكليًا دون إرسال بريد
  // (حماية من كشف الحسابات) — ونعرض للمستخدم نفس رسالة "تحقق من بريدك".
  if (error) return { ok: false, error: mapAuthError(error) };

  if (data.session) redirect(next);
  return { ok: true, data: { needsConfirmation: true } };
}

// ---------------------------------------------------------------------
// الدخول بـ Google (OAuth مع PKCE)
// ---------------------------------------------------------------------
export async function signInWithGoogle(locale: string, next: string | null): Promise<ActionResult> {
  if (!(await rateLimit("oauth", await clientIp()))) return { ok: false, error: "rateLimited" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl(safeRedirectPath(next, asLocale(locale))),
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data.url) {
    logger.warn("google oauth start failed", { code: error?.code });
    return { ok: false, error: mapAuthError(error) };
  }
  redirect(data.url);
}

// ---------------------------------------------------------------------
// استعادة كلمة المرور — الرد نفسه دائمًا سواء وُجد الحساب أم لا
// ---------------------------------------------------------------------
export async function requestPasswordReset(
  input: ForgotPasswordInput,
  locale: string,
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalidInput" };

  const ip = await clientIp();
  if (!(await rateLimit("passwordReset", ip)) || !(await rateLimit("passwordReset", parsed.data.email))) {
    return { ok: false, error: "rateLimited" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: callbackUrl(`/${asLocale(locale)}/reset-password`),
  });
  if (error) {
    const code = mapAuthError(error);
    if (code === "rateLimited") return { ok: false, error: code };
    // أي خطأ آخر لا يُكشف للمستخدم
    logger.warn("password reset request failed", { code: error.code });
  }
  return { ok: true };
}

// ---------------------------------------------------------------------
// تعيين كلمة مرور جديدة (بعد رابط الاستعادة، أو من صفحة الحساب)
// ---------------------------------------------------------------------
export async function updatePassword(input: ResetPasswordInput): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalidInput" };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return { ok: false, error: "sessionExpired" };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: mapAuthError(error) };
  return { ok: true };
}

// ---------------------------------------------------------------------
// تسجيل الخروج (من هذا الجهاز أو من كل الأجهزة)
// ---------------------------------------------------------------------
export async function signOut(locale: string, scope: "local" | "global" = "local") {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope });
  redirect(`/${asLocale(locale)}`);
}

// ---------------------------------------------------------------------
// تحديث الملف الشخصي — RLS + صلاحيات الأعمدة تمنع لمس أي حقل آخر (مثل الدور)
// ---------------------------------------------------------------------
export async function updateProfile(input: ProfileInput): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalidInput" };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { ok: false, error: "sessionExpired" };
  if (!(await rateLimit("profileUpdate", userId))) return { ok: false, error: "rateLimited" };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone || null,
      preferred_locale: parsed.data.preferredLocale,
    })
    .eq("id", userId);

  if (error) {
    logger.error("profile update failed", error);
    return { ok: false, error: "generic" };
  }
  return { ok: true };
}
