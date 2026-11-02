import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { canProcessPayments, getProvider } from "@/features/payments/config";
import { processNotification } from "@/features/payments/processor";
import { createSupabasePaymentRepo } from "@/features/payments/repo";
import { logger } from "@/lib/logger";

/**
 * عودة المستخدم من صفحة المزوّد. **ليست دليلًا على نجاح الدفع**:
 * نستخدم paymentId من الرابط فقط لنسأل المزوّد مباشرة عن الحالة (خادم-لخادم)، ثم نعرض صفحة الحالة
 * التي تقرأ من قاعدة البيانات. أي تلاعب بالرابط لا يغيّر شيئًا.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/payments/callback/[provider]">) {
  const { provider: name } = await ctx.params;
  const url = request.nextUrl;
  const orderId = url.searchParams.get("order") ?? "";
  const locale = url.searchParams.get("locale") === "en" ? "en" : "ar";
  const statusPage = new URL(`/${locale}/checkout/${encodeURIComponent(orderId)}/status`, url.origin);
  if (!/^[0-9a-f-]{36}$/.test(orderId))
    return NextResponse.redirect(new URL(`/${locale}/account/orders`, url.origin));

  const paymentId = url.searchParams.get("paymentId");
  if (name === "myfatoorah" && paymentId && canProcessPayments()) {
    const provider = getProvider("myfatoorah");
    if (provider) {
      try {
        await processNotification(
          {
            provider: "myfatoorah",
            eventId: `callback:${paymentId}:${randomUUID()}`,
            eventType: "callback",
            signatureValid: false,
            payload: { paymentId },
          },
          provider,
          createSupabasePaymentRepo(),
        );
      } catch (error) {
        // لا نفشل العودة: الـ Webhook سيكمل المعالجة لاحقًا
        logger.warn("callback verification failed", { error: (error as Error).message });
      }
    }
  }
  return NextResponse.redirect(statusPage);
}
