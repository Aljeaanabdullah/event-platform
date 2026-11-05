import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { localeFromPath } from "./lib/auth/redirect";
import { refreshSession } from "./lib/supabase/proxy";
import { routing } from "./i18n/routing";

/**
 * Proxy (كان اسمه middleware قبل Next.js 16) — يعمل قبل كل صفحة:
 *   1) تحديث جلسة Supabase (تجديد التوكن والتحقق منه).
 *   2) حماية المسارات: الحساب ولوحات المنظّم والمدير تتطلب تسجيل الدخول.
 *   3) توجيه اللغة (next-intl).
 * ملاحظة: هذه طبقة أولى فقط. الصلاحيات الفعلية (مدير/منظّم) تُفحص على الخادم
 * في كل صفحة، وفي قاعدة البيانات عبر RLS.
 */
const handleI18nRouting = createMiddleware(routing);

const PROTECTED = ["/account", "/organizer", "/admin", "/checkout"];
// صفحات لا معنى لها للمستخدم المسجّل
const GUEST_ONLY = ["/login", "/register", "/forgot-password"];

function stripLocale(pathname: string) {
  const [, maybeLocale, ...rest] = pathname.split("/");
  if ((routing.locales as readonly string[]).includes(maybeLocale)) return "/" + rest.join("/");
  return pathname;
}

const matches = (path: string, prefixes: string[]) =>
  prefixes.some((p) => path === p || path.startsWith(p + "/"));

export default async function proxy(request: NextRequest) {
  const { userId, cookiesToSet, headers } = await refreshSession(request);

  const { pathname, search } = request.nextUrl;
  const path = stripLocale(pathname);
  const locale = localeFromPath(pathname);

  let response: NextResponse;
  if (!userId && matches(path, PROTECTED)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    response = NextResponse.redirect(url);
  } else if (userId && matches(path, GUEST_ONLY)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/account`;
    url.search = "";
    response = NextResponse.redirect(url);
  } else {
    response = handleI18nRouting(request);
  }

  cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
  return response;
}

export const config = {
  // كل المسارات عدا: api و auth (مسارات خادم بلا لغة)، ملفات Next الداخلية، والملفات الثابتة (التي تحتوي على نقطة)
  matcher: "/((?!api/|auth/|_next|_vercel|.*\\..*).*)",
};
