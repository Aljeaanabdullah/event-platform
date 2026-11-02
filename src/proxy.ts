import createMiddleware from "next-intl/middleware";

import { routing } from "./i18n/routing";

/**
 * Proxy (كان اسمه middleware قبل Next.js 16).
 * حاليًا: توجيه اللغة فقط. في Phase 4 يُضاف تحديث جلسة Supabase وحماية المسارات.
 */
export default createMiddleware(routing);

export const config = {
  // كل المسارات عدا: api و auth (مسارات خادم بلا لغة)، ملفات Next الداخلية، والملفات الثابتة (التي تحتوي على نقطة)
  matcher: "/((?!api/|auth/|_next|_vercel|.*\\..*).*)",
};
