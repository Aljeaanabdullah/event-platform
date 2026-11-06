/**
 * payment-webhook: المكان الوحيد الذي يؤكد دفعات MyFatoorah.
 *   POST: إشعار Webhook من MyFatoorah.
 *   GET:  عودة المتصفح بعد الدفع (CallBackUrl/ErrorUrl)، ثم تحويل لصفحة الحالة في الموقع.
 *
 * محتوى الطلب غير موثوق في الحالتين: نأخذ منه رقم الفاتورة أو الدفع فقط، ثم نسأل MyFatoorah
 * مباشرة بمفتاح API عن الحالة والمبلغ، فلا يستطيع طلب مزوّر تأكيد دفعة لم تتم.
 * مفتاح منع التكرار يُبنى من بيانات MyFatoorah بعد التحقق، فلا يستطيع طلب مزوّر حجز رقم حدث حقيقي.
 * التذاكر تصدر حصرًا داخل confirm_order_payment (idempotent).
 */
import { createClient } from "npm:@supabase/supabase-js@2";

import { isAllowedOrigin, myFatoorah } from "../_shared/myfatoorah.ts";

type StatusResponse = {
  Data?: {
    InvoiceId: number;
    InvoiceStatus: string;
    InvoiceValue: number;
    CustomerReference?: string | null;
    InvoiceTransactions?: {
      TransactionStatus?: string;
      TotalServiceCharge?: string | number;
      Error?: string | null;
    }[];
  };
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const toFils = (value: string | number) => Math.round(Number(value) * 1000);

const db = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

type Outcome = { status: number; result: string };

async function verifyAndApply(key: string, keyType: "InvoiceId" | "PaymentId"): Promise<Outcome> {
  const { Data: invoice } = await myFatoorah<StatusResponse>("/v2/GetPaymentStatus", {
    Key: key,
    KeyType: keyType,
  });
  const paymentId = invoice?.CustomerReference;
  if (!invoice || !paymentId || !UUID.test(paymentId)) return { status: 400, result: "unverifiable" };

  const admin = db();
  const { data: payment } = await admin
    .from("payments")
    .select("id, order_id, provider, provider_payment_id, amount_fils")
    .eq("id", paymentId)
    .maybeSingle();
  const invoiceId = String(invoice.InvoiceId);
  if (!payment || payment.provider !== "myfatoorah") return { status: 400, result: "unknown_payment" };
  if (payment.provider_payment_id && payment.provider_payment_id !== invoiceId) {
    return { status: 409, result: "invoice_mismatch" };
  }

  const tx =
    invoice.InvoiceTransactions?.find((t) => /^succ/i.test(t.TransactionStatus ?? "")) ??
    invoice.InvoiceTransactions?.at(-1);
  const invoiceStatus = invoice.InvoiceStatus?.toLowerCase();
  const status =
    invoiceStatus === "paid"
      ? "paid"
      : invoiceStatus === "canceled" || invoiceStatus === "cancelled"
        ? "cancelled"
        : tx?.TransactionStatus?.toLowerCase() === "failed"
          ? "failed"
          : "pending";
  if (status === "pending") return { status: 200, result: "pending" };

  const eventId = `invoice:${invoiceId}:${status}`;
  await admin.from("payment_events").upsert(
    {
      provider: "myfatoorah",
      provider_event_id: eventId,
      event_type: "verified_status",
      payload: { invoiceId, status, invoiceValue: invoice.InvoiceValue },
      signature_valid: false,
    },
    { onConflict: "provider,provider_event_id", ignoreDuplicates: true },
  );
  const { data: event } = await admin
    .from("payment_events")
    .select("processed_at")
    .eq("provider", "myfatoorah")
    .eq("provider_event_id", eventId)
    .single();
  if (event?.processed_at) {
    console.log("duplicate webhook ignored", eventId);
    return { status: 200, result: "duplicate_event" };
  }

  const finish = (error?: string) =>
    admin
      .from("payment_events")
      .update({ processed_at: new Date().toISOString(), error: error ?? null })
      .eq("provider", "myfatoorah")
      .eq("provider_event_id", eventId);

  if (status === "paid") {
    const amountFils = toFils(invoice.InvoiceValue);
    if (amountFils !== Number(payment.amount_fils)) {
      const { error } = await admin.rpc("mark_payment_failed", {
        p_payment_id: payment.id,
        p_status: "failed",
        p_reason: "amount_mismatch",
        p_raw: invoice,
      });
      if (error) throw error;
      await finish("amount_mismatch");
      return { status: 409, result: "amount_mismatch" };
    }
    if (tx?.TotalServiceCharge !== undefined) {
      const fee = toFils(tx.TotalServiceCharge);
      if (Number.isFinite(fee)) {
        await admin.from("payments").update({ gateway_fee_fils: fee }).eq("id", payment.id);
      }
    }
    const { data: result, error } = await admin.rpc("confirm_order_payment", {
      p_order_id: payment.order_id,
      p_provider: "myfatoorah",
      p_provider_payment_id: invoiceId,
      p_amount_fils: amountFils,
    });
    if (error) throw error;
    await finish();
    return { status: 200, result: String(result) };
  }

  const { error } = await admin.rpc("mark_payment_failed", {
    p_payment_id: payment.id,
    p_status: status,
    p_reason: status === "failed" ? (tx?.Error ?? "failed") : "cancelled",
    p_raw: invoice,
  });
  if (error) throw error;
  await finish();
  console.log("payment not completed", status, tx?.Error ?? "");
  return { status: 200, result: status };
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === "GET") {
    const order = url.searchParams.get("order") ?? "";
    const locale = url.searchParams.get("locale") === "en" ? "en" : "ar";
    const site = url.searchParams.get("return");
    const paymentId = url.searchParams.get("paymentId");
    if (!isAllowedOrigin(site) || !UUID.test(order)) {
      return new Response("Invalid return address", { status: 400 });
    }
    if (paymentId) {
      try {
        await verifyAndApply(paymentId, "PaymentId");
      } catch (error) {
        // لا نعطّل عودة العميل: صفحة الحالة تقرأ من قاعدة البيانات
        console.warn("callback verification failed", (error as Error).message);
      }
    }
    return Response.redirect(`${site}/${locale}/checkout/${order}/status`, 302);
  }

  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const raw = await req.text();
  if (raw.length > 64_000) return Response.json({ error: "too_large" }, { status: 413 });
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "bad_json" }, { status: 400 });
  }
  const data = (body.Data ?? body.data ?? {}) as Record<string, unknown>;
  const invoice = (data.Invoice ?? {}) as Record<string, unknown>;
  const transaction = (data.Transaction ?? {}) as Record<string, unknown>;
  const invoiceId = invoice.Id ?? data.InvoiceId;
  const paymentId = transaction.PaymentId ?? data.PaymentId;
  if (!invoiceId && !paymentId) return Response.json({ result: "unverifiable" }, { status: 400 });

  try {
    const outcome = invoiceId
      ? await verifyAndApply(String(invoiceId), "InvoiceId")
      : await verifyAndApply(String(paymentId), "PaymentId");
    return Response.json({ result: outcome.result }, { status: outcome.status });
  } catch (error) {
    console.error("webhook failed", (error as Error).message);
    return Response.json({ error: "verification_failed" }, { status: 502 });
  }
});
