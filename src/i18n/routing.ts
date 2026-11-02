import { defineRouting } from "next-intl/routing";

/**
 * إعدادات اللغات والمسارات.
 * - كل صفحة لها رابط مستقل لكل لغة (/ar/... و /en/...) لتحسين SEO.
 * - اختيار المستخدم يُحفظ في كوكي NEXT_LOCALE ويُستخدم في الزيارات القادمة.
 * - عند عدم وجود اختيار محفوظ، تُستخدم لغة المتصفح ثم العربية افتراضيًا.
 */
export const routing = defineRouting({
  locales: ["ar", "en"],
  defaultLocale: "ar",
  localePrefix: "always",
  localeCookie: {
    // سنة كاملة
    maxAge: 60 * 60 * 24 * 365,
  },
});

export type Locale = (typeof routing.locales)[number];

export const localeDirection: Record<Locale, "rtl" | "ltr"> = {
  ar: "rtl",
  en: "ltr",
};
