import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

import type { ConfirmResult, PaymentRepo } from "./processor";

/**
 * تنفيذ PaymentRepo على Supabase بالمفتاح السري — يُستخدم فقط بعد التحقق من الإشعار.
 * تأكيد الدفع وإصدار التذاكر يتمان حصرًا داخل confirm_order_payment (معاملة واحدة في Postgres).
 */
export function createSupabasePaymentRepo(): PaymentRepo {
  const db = createAdminClient();

  return {
    async recordEvent(n) {
      const { data, error } = await db
        .from("payment_events")
        .upsert(
          {
            provider: n.provider,
            provider_event_id: n.eventId,
            event_type: n.eventType.slice(0, 100),
            payload: n.payload as Json,
            signature_valid: n.signatureValid,
          },
          { onConflict: "provider,provider_event_id", ignoreDuplicates: true },
        )
        .select("id");
      if (error) throw error;
      if (data?.length) return { isNew: true, alreadyProcessed: false };
      const { data: existing } = await db
        .from("payment_events")
        .select("processed_at")
        .eq("provider", n.provider)
        .eq("provider_event_id", n.eventId)
        .single();
      return { isNew: false, alreadyProcessed: !!existing?.processed_at };
    },

    async markEventProcessed(n, error) {
      await db
        .from("payment_events")
        .update({ processed_at: new Date().toISOString(), error: error ?? null })
        .eq("provider", n.provider)
        .eq("provider_event_id", n.eventId);
    },

    async getPayment(paymentId) {
      if (!/^[0-9a-f-]{36}$/.test(paymentId)) return null;
      const { data } = await db
        .from("payments")
        .select("id, order_id, provider, amount_fils")
        .eq("id", paymentId)
        .maybeSingle();
      return data
        ? {
            id: data.id,
            orderId: data.order_id,
            provider: data.provider,
            amountFils: Number(data.amount_fils),
          }
        : null;
    },

    async confirm({ orderId, provider, sessionId, amountFils }) {
      const { data, error } = await db.rpc("confirm_order_payment", {
        p_order_id: orderId,
        p_provider: provider,
        p_provider_payment_id: sessionId,
        p_amount_fils: amountFils,
      });
      if (error) throw error;
      return data as ConfirmResult;
    },

    async markFailed({ paymentId, status, reason, raw }) {
      const { error } = await db.rpc("mark_payment_failed", {
        p_payment_id: paymentId,
        p_status: status,
        p_reason: reason,
        p_raw: (raw ?? null) as Json,
      });
      if (error) throw error;
    },

    async setGatewayFee(paymentId, feeFils) {
      await db.from("payments").update({ gateway_fee_fils: feeFils }).eq("id", paymentId);
    },
  };
}
