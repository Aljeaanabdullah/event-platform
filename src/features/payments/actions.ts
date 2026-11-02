"use server";

/**
 * بدء الدفع من صفحة الإتمام، وإكمال الدفع في صفحة المزوّد الوهمي.
 * المبلغ لا يأتي من المتصفح أبدًا: start_order_payment تأخذه من الطلب في قاعدة البيانات
 * وترفض الطلبات المنتهية أو المدفوعة أو المجانية.
 */
import { getUserContext } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { siteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

import { canProcessPayments, getMockProvider, getProvider, isMockAllowed } from "./config";
import { processNotification } from "./processor";
import type { MockOutcome } from "./providers/mock";
import { createSupabasePaymentRepo } from "./repo";

export type StartPaymentResult =
  | { ok: true; redirectUrl: string }
  | {
      ok: false;
      error: "notConfigured" | "notPayable" | "tooManyAttempts" | "sessionExpired" | "providerError";
    };

export async function startPayment(orderId: string, locale: "ar" | "en"): Promise<StartPaymentResult> {
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "sessionExpired" };
  const provider = getProvider();
  if (!provider) return { ok: false, error: "notConfigured" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_order_payment", {
    p_order_id: orderId,
    p_provider: provider.name,
  });
  if (error || !data?.[0]) {
    if (error?.message === "TOO_MANY_ATTEMPTS") return { ok: false, error: "tooManyAttempts" };
    if (error) logger.warn("start payment rejected", { code: error.code, message: error.message });
    return { ok: false, error: "notPayable" };
  }
  const p = data[0];

  try {
    const session = await provider.createSession({
      paymentId: p.payment_id,
      orderId,
      orderNumber: p.order_number,
      amountFils: Number(p.amount_fils),
      currency: p.currency,
      locale,
      customerName: ctx.profile.full_name ?? "",
      customerEmail: ctx.email,
      callbackUrl: `${siteUrl}/api/payments/callback/${provider.name}?order=${orderId}&locale=${locale}`,
      errorUrl: `${siteUrl}/api/payments/callback/${provider.name}?order=${orderId}&locale=${locale}&error=1`,
    });
    const { error: attachError } = await supabase.rpc("attach_payment_session", {
      p_payment_id: p.payment_id,
      p_provider_payment_id: session.sessionId,
      p_invoice_id: session.invoiceId,
    });
    if (attachError) throw attachError;
    return { ok: true, redirectUrl: session.redirectUrl };
  } catch (err) {
    logger.error("create payment session failed", err, { provider: provider.name });
    return { ok: false, error: "providerError" };
  }
}

export type MockCompleteResult =
  | { ok: true; orderId: string }
  | { ok: false; error: "disabled" | "notFound" | "serverKeyMissing" | "failed" };

/**
 * صفحة الدفع الوهمية: يختار المختبر النتيجة، فنبني إشعارًا موقّعًا ونمرّره لنفس معالج الـ Webhook
 * (داخل الخادم — نفس الكود الذي يستقبل الإشعارات عبر HTTP).
 */
export async function completeMockPayment(
  paymentId: string,
  outcome: MockOutcome,
): Promise<MockCompleteResult> {
  if (!isMockAllowed()) return { ok: false, error: "disabled" };
  const ctx = await getUserContext();
  if (!ctx) return { ok: false, error: "notFound" };

  // RLS: المشتري يرى دفعاته فقط
  const supabase = await createClient();
  const { data: payment } = await supabase
    .from("payments")
    .select("id, order_id, provider, provider_payment_id, amount_fils, currency, status")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment || payment.provider !== "mock" || !payment.provider_payment_id)
    return { ok: false, error: "notFound" };
  if (!canProcessPayments()) return { ok: false, error: "serverKeyMissing" };

  const mock = getMockProvider();
  const { body, signature } = mock.buildWebhook({
    payment_id: payment.id,
    session_id: payment.provider_payment_id,
    status: outcome,
    amount_fils: Number(payment.amount_fils),
    currency: payment.currency,
  });
  try {
    const notification = mock.verifyRaw(body, signature)!;
    await processNotification(notification, mock, createSupabasePaymentRepo());
    return { ok: true, orderId: payment.order_id };
  } catch (err) {
    logger.error("mock payment processing failed", err);
    return { ok: false, error: "failed" };
  }
}
