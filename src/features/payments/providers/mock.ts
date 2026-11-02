/**
 * مزوّد دفع وهمي (Mock) للتطوير والاختبار فقط — ليس مزوّد دفع حقيقيًا ولا يتصل بأي بنك.
 *  - "صفحة الدفع المستضافة" هي /payments/mock/[paymentId] داخل تطبيقنا (لا حقول بطاقة إطلاقًا).
 *  - النتيجة (نجاح/فشل/إلغاء) تُرسل كإشعار موقّع HMAC-SHA256 بـ MOCK_PAYMENT_SECRET، تمامًا كما يفعل مزوّد حقيقي.
 *  - معطّل في Production دائمًا (انظر config.ts).
 */
import { randomUUID } from "node:crypto";

import { signPayload, verifySignature } from "../signature";
import type {
  CreateSessionInput,
  CreateSessionResult,
  IncomingNotification,
  PaymentProvider,
  VerifiedPaymentStatus,
} from "../types";

export type MockOutcome = "paid" | "failed" | "cancelled";

export type MockWebhookPayload = {
  event_id: string;
  type: "payment.updated";
  payment_id: string;
  session_id: string;
  status: MockOutcome;
  amount_fils: number;
  currency: string;
  /** علامة بيانات اختبار (تسمح لسكربت التنظيف بحذف هذه الأحداث) */
  test: true;
};

export const MOCK_SIGNATURE_HEADER = "x-mock-signature";

export function createMockProvider(options: { secret: string; siteUrl: string }): PaymentProvider & {
  buildWebhook(input: Omit<MockWebhookPayload, "event_id" | "type" | "test">): {
    body: string;
    signature: string;
  };
  verifyRaw(rawBody: string, signature: string | null): IncomingNotification | null;
} {
  return {
    name: "mock",

    async createSession(input: CreateSessionInput): Promise<CreateSessionResult> {
      const sessionId = `mock_${input.paymentId}`;
      return {
        sessionId,
        redirectUrl: `${options.siteUrl}/${input.locale}/payments/mock/${input.paymentId}`,
      };
    },

    buildWebhook(input) {
      const payload: MockWebhookPayload = {
        event_id: randomUUID(),
        type: "payment.updated",
        test: true,
        ...input,
      };
      const body = JSON.stringify(payload);
      return { body, signature: signPayload(body, options.secret) };
    },

    /** يتحقق من التوقيع على الجسم الخام كما وصل (قبل أي تحليل) */
    verifyRaw(rawBody, signature) {
      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(rawBody);
      } catch {
        return null;
      }
      return {
        provider: "mock",
        eventId: String(payload.event_id ?? ""),
        eventType: String(payload.type ?? ""),
        signatureValid: verifySignature(rawBody, signature, options.secret),
        payload,
      };
    },

    async verify(notification: IncomingNotification): Promise<VerifiedPaymentStatus | null> {
      // للمزوّد الوهمي: الإشعار الموقّع هو المصدر الموثوق (لا يوجد خادم خارجي نسأله)
      if (!notification.signatureValid) return null;
      const p = notification.payload as Partial<MockWebhookPayload>;
      if (!p.payment_id || !p.session_id || !p.status || typeof p.amount_fils !== "number") return null;
      return {
        status: p.status,
        paymentId: p.payment_id,
        sessionId: p.session_id,
        amountFils: p.amount_fils,
        currency: p.currency ?? "KWD",
        gatewayFeeFils: null,
        failureReason: p.status === "paid" ? undefined : `mock_${p.status}`,
        raw: p,
      };
    },
  };
}
