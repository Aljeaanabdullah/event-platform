import "server-only";

/**
 * هل نعرض بيانات الاختبار (جهات is_test)؟
 * فقط عند SHOW_TEST_DATA=1 وخارج بيئة Production في Vercel — حماية مزدوجة
 * حتى لو ضُبط المتغير بالخطأ في الإنتاج.
 */
export function includeTestData(): boolean {
  return process.env.SHOW_TEST_DATA === "1" && process.env.VERCEL_ENV !== "production";
}
