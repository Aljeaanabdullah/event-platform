import "server-only";

import { siteUrl } from "@/lib/site-url";

import { createMockProvider } from "./providers/mock";
import { createMyFatoorahProvider } from "./providers/myfatoorah";
import type { PaymentProvider, ProviderName } from "./types";

/**
 * اختيار مزوّد الدفع من متغيرات البيئة (للخادم فقط — لا تبدأ بـ NEXT_PUBLIC_):
 *  - MYFATOORAH_API_KEY + MYFATOORAH_BASE_URL  → MyFatoorah (Sandbox أو Live حسب الرابط والمفتاح)
 *  - PAYMENT_PROVIDER=mock + MOCK_PAYMENT_SECRET → المزوّد الوهمي — **ممنوع في Production دائمًا**
 *  - غير ذلك → لا يوجد دفع (صفحة الإتمام تعرض أن الدفع غير مفعّل)
 */
export function isMockAllowed(): boolean {
  return (
    process.env.PAYMENT_PROVIDER === "mock" &&
    process.env.VERCEL_ENV !== "production" &&
    (process.env.MOCK_PAYMENT_SECRET?.length ?? 0) >= 16
  );
}

export function getProvider(name?: ProviderName): PaymentProvider | null {
  const wanted = name ?? (process.env.MYFATOORAH_API_KEY ? "myfatoorah" : isMockAllowed() ? "mock" : null);
  if (wanted === "myfatoorah" && process.env.MYFATOORAH_API_KEY) {
    return createMyFatoorahProvider({
      apiKey: process.env.MYFATOORAH_API_KEY,
      baseUrl: process.env.MYFATOORAH_BASE_URL || "https://apitest.myfatoorah.com",
    });
  }
  if (wanted === "mock" && isMockAllowed()) return getMockProvider();
  return null;
}

export function getMockProvider() {
  if (!isMockAllowed()) throw new Error("mock payments are disabled");
  return createMockProvider({ secret: process.env.MOCK_PAYMENT_SECRET!, siteUrl });
}

/** معالجة الإشعارات تحتاج المفتاح السري (confirm_order_payment للخادم فقط) */
export function canProcessPayments(): boolean {
  return !!process.env.SUPABASE_SECRET_KEY;
}
