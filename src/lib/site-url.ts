/**
 * عنوان الموقع الكامل (يُستخدم لروابط العودة في المصادقة وفي metadata).
 *
 * الترتيب:
 *  1) NEXT_PUBLIC_SITE_URL إذا ضُبط صراحةً (النطاق الرسمي في الإنتاج).
 *  2) على Vercel: عنوان الإنتاج للمشروع، أو عنوان الفرع في نسخ المعاينة (Preview)
 *     — متغيرات نظام يضيفها Vercel تلقائيًا لمشاريع Next.js.
 *  3) http://localhost:3000 محليًا.
 *
 * ملاحظة: Next.js يستبدل process.env.NEXT_PUBLIC_* وقت البناء فقط عند كتابتها حرفيًا.
 */
type SiteUrlEnv = {
  NEXT_PUBLIC_SITE_URL?: string;
  NEXT_PUBLIC_VERCEL_ENV?: string;
  NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL?: string;
  NEXT_PUBLIC_VERCEL_BRANCH_URL?: string;
  NEXT_PUBLIC_VERCEL_URL?: string;
};

const withProtocol = (host: string) => (/^https?:\/\//.test(host) ? host : `https://${host}`);
const trim = (url: string) => url.replace(/\/+$/, "");

export function resolveSiteUrl(env: SiteUrlEnv): string {
  if (env.NEXT_PUBLIC_SITE_URL) return trim(env.NEXT_PUBLIC_SITE_URL);
  if (env.NEXT_PUBLIC_VERCEL_ENV === "production" && env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL) {
    return trim(withProtocol(env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL));
  }
  const vercelHost = env.NEXT_PUBLIC_VERCEL_BRANCH_URL || env.NEXT_PUBLIC_VERCEL_URL;
  if (vercelHost) return trim(withProtocol(vercelHost));
  return "http://localhost:3000";
}

export const siteUrl = resolveSiteUrl({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
  NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
  NEXT_PUBLIC_VERCEL_BRANCH_URL: process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL,
  NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL,
});
