/**
 * معالجة إشعارات الدفع — منطق مستقل عن قاعدة البيانات (Repository قابل للاستبدال في الاختبارات).
 *
 * القواعد:
 *  1) كل إشعار يُسجَّل في payment_events بمفتاح فريد (provider + event_id) => Idempotency:
 *     نفس الحدث مرتين لا يُعالج مرتين.
 *  2) توقيع غير صالح => يُسجَّل ويُرفض (401) ولا يمس أي طلب.
 *  3) الحالة والمبلغ يُؤخذان من مصدر موثوق (توقيع صالح أو استعلام مباشر من المزوّد) — لا من رابط العودة.
 *  4) الدفع الناجح يمر حصرًا عبر confirm_order_payment في قاعدة البيانات:
 *     يتحقق من المبلغ (AMOUNT_MISMATCH)، يصدر التذاكر مرة واحدة، ويتعامل مع الدفع المتأخر بعد انتهاء الحجز
 *     (إعادة حجز إن توفرت الكمية وإلا needs_refund)، ويكشف الدفع المكرر.
 */
import type { IncomingNotification, PaymentProvider, VerifiedPaymentStatus } from "./types";

export type ConfirmResult = "paid" | "already_paid" | "needs_refund" | "duplicate_payment";

export interface PaymentRepo {
  /** يسجّل الحدث؛ يُرجع false إن كان مسجّلًا ومعالجًا من قبل */
  recordEvent(n: IncomingNotification): Promise<{ isNew: boolean; alreadyProcessed: boolean }>;
  markEventProcessed(n: IncomingNotification, error?: string): Promise<void>;
  getPayment(
    paymentId: string,
  ): Promise<{ id: string; orderId: string; provider: string; amountFils: number } | null>;
  confirm(input: {
    orderId: string;
    provider: string;
    sessionId: string;
    amountFils: number;
  }): Promise<ConfirmResult>;
  markFailed(input: {
    paymentId: string;
    status: "failed" | "cancelled";
    reason?: string;
    raw?: unknown;
  }): Promise<void>;
  setGatewayFee(paymentId: string, feeFils: number): Promise<void>;
}

export type ProcessOutcome =
  | { status: 200; result: ConfirmResult | "failed" | "cancelled" | "pending" | "duplicate_event" }
  | { status: 400; result: "unknown_payment" | "unverifiable" }
  | { status: 401; result: "invalid_signature" }
  | { status: 409; result: "amount_mismatch" | "provider_mismatch" };

export async function processNotification(
  n: IncomingNotification,
  provider: PaymentProvider,
  repo: PaymentRepo,
): Promise<ProcessOutcome> {
  const recorded = await repo.recordEvent(n);
  if (recorded.alreadyProcessed) return { status: 200, result: "duplicate_event" };

  if (!n.signatureValid && provider.name === "mock") {
    await repo.markEventProcessed(n, "invalid_signature");
    return { status: 401, result: "invalid_signature" };
  }

  let verified: VerifiedPaymentStatus | null;
  try {
    verified = await provider.verify(n);
  } catch (error) {
    await repo.markEventProcessed(n, `verify_failed: ${(error as Error).message}`.slice(0, 500));
    throw error; // => 5xx: المزوّد يعيد المحاولة لاحقًا
  }
  if (!verified) {
    await repo.markEventProcessed(n, "unverifiable");
    return { status: 400, result: "unverifiable" };
  }

  const payment = await repo.getPayment(verified.paymentId);
  if (!payment) {
    await repo.markEventProcessed(n, "unknown_payment");
    return { status: 400, result: "unknown_payment" };
  }
  if (payment.provider !== provider.name) {
    await repo.markEventProcessed(n, "provider_mismatch");
    return { status: 409, result: "provider_mismatch" };
  }

  if (verified.status === "paid") {
    // المبلغ المدفوع يجب أن يطابق المبلغ المحسوب على الخادم وقت إنشاء الدفعة
    if (verified.amountFils !== payment.amountFils || verified.currency !== "KWD") {
      await repo.markFailed({
        paymentId: payment.id,
        status: "failed",
        reason: "amount_mismatch",
        raw: verified.raw,
      });
      await repo.markEventProcessed(n, "amount_mismatch");
      return { status: 409, result: "amount_mismatch" };
    }
    if (verified.gatewayFeeFils != null) await repo.setGatewayFee(payment.id, verified.gatewayFeeFils);
    const result = await repo.confirm({
      orderId: payment.orderId,
      provider: provider.name,
      sessionId: verified.sessionId,
      amountFils: verified.amountFils,
    });
    await repo.markEventProcessed(n);
    return { status: 200, result };
  }

  if (verified.status === "failed" || verified.status === "cancelled") {
    await repo.markFailed({
      paymentId: payment.id,
      status: verified.status,
      reason: verified.failureReason,
      raw: verified.raw,
    });
    await repo.markEventProcessed(n);
    return { status: 200, result: verified.status };
  }

  await repo.markEventProcessed(n);
  return { status: 200, result: "pending" };
}
