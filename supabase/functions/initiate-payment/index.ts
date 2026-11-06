/**
 * initiate-payment: يبدأ الدفع لطلب يملكه المستخدم ويرجع رابط صفحة MyFatoorah.
 *
 * يقرأ من المتصفح رقم الطلب واللغة فقط. المبلغ والعملة والمرجع تأتي من قاعدة البيانات عبر
 * start_order_payment (تتحقق من الملكية وأن الطلب قابل للدفع)، وأي amount في الطلب يُتجاهل.
 * لا تغيّر هذه الدالة حالة الطلب إلى مدفوع ولا تصدر تذاكر.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

import { isAllowedOrigin, myFatoorah } from "../_shared/myfatoorah.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const allowed = isAllowedOrigin(origin);
  const headers = {
    ...(allowed ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
    "Content-Type": "application/json",
  };
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return reply({ error: "methodNotAllowed" }, 405);
  if (!allowed) return reply({ error: "forbiddenOrigin" }, 403);

  const authorization = req.headers.get("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token) return reply({ error: "sessionExpired" }, 401);

  const body = await req.json().catch(() => ({}));
  const orderId = String(body.orderId ?? "");
  const locale = body.locale === "en" ? "en" : "ar";
  if (!UUID.test(orderId)) return reply({ error: "notPayable" }, 400);

  // عميل بصلاحية المستخدم نفسه: RLS والدوال ترى auth.uid() الخاص به
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: auth, error: authError } = await supabase.auth.getUser(token);
  if (authError || !auth.user) return reply({ error: "sessionExpired" }, 401);

  const { data: started, error: startError } = await supabase.rpc("start_order_payment", {
    p_order_id: orderId,
    p_provider: "myfatoorah",
  });
  if (startError || !started?.[0]) {
    if (startError?.message === "TOO_MANY_ATTEMPTS") return reply({ error: "tooManyAttempts" }, 429);
    console.warn("start_order_payment rejected", startError?.code, startError?.message);
    return reply({ error: "notPayable" }, 409);
  }
  const payment = started[0];
  const amount = Number(payment.amount_fils) / 1000;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", auth.user.id)
    .maybeSingle();

  const callback = new URL(`${Deno.env.get("SUPABASE_URL")}/functions/v1/payment-webhook`);
  callback.searchParams.set("order", orderId);
  callback.searchParams.set("locale", locale);
  callback.searchParams.set("return", origin);

  try {
    const session = await myFatoorah<{ Data: { InvoiceId: number; InvoiceURL: string } }>("/v2/SendPayment", {
      CustomerName: (profile?.full_name ?? "Customer").slice(0, 100),
      NotificationOption: "LNK",
      InvoiceValue: amount,
      DisplayCurrencyIso: payment.currency,
      CustomerEmail: auth.user.email ?? undefined,
      CallBackUrl: callback.toString(),
      ErrorUrl: callback.toString(),
      Language: locale === "ar" ? "AR" : "EN",
      CustomerReference: payment.payment_id,
      UserDefinedField: orderId,
      InvoiceItems: [{ ItemName: `Order ${payment.order_number}`, Quantity: 1, UnitPrice: amount }],
    });

    const invoiceId = String(session.Data.InvoiceId);
    const { error: attachError } = await supabase.rpc("attach_payment_session", {
      p_payment_id: payment.payment_id,
      p_provider_payment_id: invoiceId,
      p_invoice_id: invoiceId,
    });
    if (attachError) throw attachError;

    return reply({ paymentUrl: session.Data.InvoiceURL });
  } catch (error) {
    console.error("create payment session failed", (error as Error).message);
    return reply({ error: "providerError" }, 502);
  }
});
