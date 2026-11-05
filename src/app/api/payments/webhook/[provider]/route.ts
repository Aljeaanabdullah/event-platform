import { randomUUID } from "node:crypto";

import { canProcessPayments, getProvider } from "@/features/payments/config";
import { processNotification } from "@/features/payments/processor";
import { MOCK_SIGNATURE_HEADER, type createMockProvider } from "@/features/payments/providers/mock";
import { createSupabasePaymentRepo } from "@/features/payments/repo";
import type { IncomingNotification } from "@/features/payments/types";
import { logger } from "@/lib/logger";

/**
 * استقبال إشعارات الدفع (Webhook).
 *  - mock: توقيع HMAC على الجسم الخام في ترويسة x-mock-signature.
 *  - myfatoorah: نستخدم الإشعار كمنبّه فقط ونتحقق من الحالة مباشرة عبر GetPaymentStatus.
 * الاستجابة: 200 (بما فيها التكرار)، 400/401/409 لإشعارات مرفوضة، 503 عند تعذر المعالجة (يعيد المزوّد المحاولة).
 */
export async function POST(request: Request, ctx: RouteContext<"/api/payments/webhook/[provider]">) {
  const { provider: name } = await ctx.params;
  if (name !== "mock" && name !== "myfatoorah")
    return Response.json({ error: "unknown_provider" }, { status: 404 });
  const provider = getProvider(name);
  if (!provider) return Response.json({ error: "provider_disabled" }, { status: 404 });
  if (!canProcessPayments()) return Response.json({ error: "not_configured" }, { status: 503 });

  const raw = await request.text();
  if (raw.length > 64_000) return Response.json({ error: "too_large" }, { status: 413 });

  let notification: IncomingNotification | null;
  if (name === "mock") {
    notification = (provider as ReturnType<typeof createMockProvider>).verifyRaw(
      raw,
      request.headers.get(MOCK_SIGNATURE_HEADER),
    );
  } else {
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(raw);
    } catch {
      return Response.json({ error: "bad_json" }, { status: 400 });
    }
    const event = (payload.Event ?? {}) as Record<string, unknown>;
    notification = {
      provider: "myfatoorah",
      eventId: String(event.Reference ?? randomUUID()),
      eventType: String(event.Name ?? "unknown"),
      // التوقيع غير معتمد هنا: الحالة تُجلب من MyFatoorah مباشرة (انظر docs/PAYMENTS.md)
      signatureValid: false,
      payload,
    };
  }
  if (!notification?.eventId) return Response.json({ error: "bad_payload" }, { status: 400 });

  try {
    const outcome = await processNotification(notification, provider, createSupabasePaymentRepo());
    return Response.json({ result: outcome.result }, { status: outcome.status });
  } catch (error) {
    logger.error("payment webhook failed", error, { provider: name });
    return Response.json({ error: "processing_failed" }, { status: 503 });
  }
}
