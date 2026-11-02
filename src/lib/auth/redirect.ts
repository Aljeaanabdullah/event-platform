import { routing, type Locale } from "@/i18n/routing";

/**
 * يتحقق من مسار إعادة التوجيه بعد الدخول (معامل next) لمنع Open Redirect:
 * يُقبل فقط مسار داخلي يبدأ بلغة مدعومة، وإلا نعود للمسار الافتراضي.
 */
export function safeRedirectPath(next: string | null | undefined, locale: Locale): string {
  const fallback = `/${locale}/account`;
  if (!next || typeof next !== "string") return fallback;
  if (next.length > 512) return fallback;
  // يرفض: روابط خارجية، //evil.com، /\evil.com، والمحارف غير المرئية
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\\]/.test(next)) return fallback;

  const firstSegment = next.split(/[/?#]/)[1];
  if (!(routing.locales as readonly string[]).includes(firstSegment)) return fallback;
  return next;
}

/** يستخرج اللغة من مسار، أو يُرجع الافتراضية */
export function localeFromPath(path: string | null | undefined): Locale {
  const seg = path?.split(/[/?#]/)[1];
  return (routing.locales as readonly string[]).includes(seg ?? "") ? (seg as Locale) : routing.defaultLocale;
}
