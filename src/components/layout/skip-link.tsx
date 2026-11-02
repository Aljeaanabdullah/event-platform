import { useTranslations } from "next-intl";

/** رابط "تخطَّ إلى المحتوى" لمستخدمي لوحة المفاتيح وقارئات الشاشة — يظهر عند التركيز فقط */
export function SkipLink() {
  const t = useTranslations("Nav");
  return (
    <a
      href="#main-content"
      className="sr-only z-100 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
    >
      {t("skipToContent")}
    </a>
  );
}
