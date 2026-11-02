import "server-only";

import type { HomeSections } from "./types";

/**
 * جلب أقسام الصفحة الرئيسية.
 *
 * حاليًا لا توجد قاعدة بيانات (تُبنى في Phase 3)، لذلك تُرجع الدالة أقسامًا فارغة
 * وتعرض الصفحة حالة "لا توجد فعاليات منشورة بعد" — دون أي بيانات وهمية.
 * في Phase 5 تُستبدل باستعلامات Supabase الفعلية (بما فيها "الأكثر شعبية" من الحجوزات الحقيقية).
 */
export async function getHomeSections(): Promise<HomeSections> {
  return { featured: [], thisWeek: [], weekend: [], free: [], upcoming: [], popular: [] };
}
