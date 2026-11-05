import { describe, expect, it, vi } from "vitest";

import { processNotification, type ConfirmResult, type PaymentRepo } from "./processor";
import { createMockProvider } from "./providers/mock";
import { createMyFatoorahProvider } from "./providers/myfatoorah";
import { signPayload, verifySignature } from "./signature";

const SECRET = "test-secret-for-unit-tests-only";
const PAYMENT_ID = "11111111-1111-4111-8111-111111111111";
const ORDER_ID = "22222222-2222-4222-8222-222222222222";

/** مستودع وهمي يحاكي سلوك قاعدة البيانات الأساسي (للتحقق من منطق التنسيق فقط) */
function fakeRepo(opts: { amountFils?: number; provider?: string; confirmResults?: ConfirmResult[] } = {}) {
  const events = new Map<string, { processed: boolean; error?: string }>();
  const results = [...(opts.confirmResults ?? ["paid", "already_paid"])];
  const repo: PaymentRepo & {
    confirms: number;
    failed: { status: string; reason?: string }[];
    fee?: number;
  } = {
    confirms: 0,
    failed: [],
    async recordEvent(n) {
      const key = `${n.provider}:${n.eventId}`;
      const existing = events.get(key);
      if (existing) return { isNew: false, alreadyProcessed: existing.processed };
      events.set(key, { processed: false });
      return { isNew: true, alreadyProcessed: false };
    },
    async markEventProcessed(n, error) {
      events.set(`${n.provider}:${n.eventId}`, { processed: true, error });
    },
    async getPayment(id) {
      return id === PAYMENT_ID
        ? { id, orderId: ORDER_ID, provider: opts.provider ?? "mock", amountFils: opts.amountFils ?? 30_000 }
        : null;
    },
    async confirm() {
      repo.confirms += 1;
      return results.shift() ?? "already_paid";
    },
    async markFailed(input) {
      repo.failed.push({ status: input.status, reason: input.reason });
    },
    async setGatewayFee(_id, fee) {
      repo.fee = fee;
    },
  };
  return repo;
}

const mock = createMockProvider({ secret: SECRET, siteUrl: "http://localhost:3000" });
const notify = (status: "paid" | "failed" | "cancelled", amount = 30_000) => {
  const { body, signature } = mock.buildWebhook({
    payment_id: PAYMENT_ID,
    session_id: `mock_${PAYMENT_ID}`,
    status,
    amount_fils: amount,
    currency: "KWD",
  });
  return { body, signature, n: mock.verifyRaw(body, signature)! };
};

describe("التوقيع", () => {
  it("يقبل التوقيع الصحيح ويرفض المعدّل", () => {
    const sig = signPayload('{"a":1}', SECRET);
    expect(verifySignature('{"a":1}', sig, SECRET)).toBe(true);
    expect(verifySignature('{"a":2}', sig, SECRET)).toBe(false);
    expect(verifySignature('{"a":1}', sig, "other-secret")).toBe(false);
    expect(verifySignature('{"a":1}', null, SECRET)).toBe(false);
    expect(verifySignature('{"a":1}', "short", SECRET)).toBe(false);
  });
});

describe("معالجة إشعارات الدفع", () => {
  it("نجاح الدفع يؤكد الطلب مرة واحدة", async () => {
    const repo = fakeRepo();
    const res = await processNotification(notify("paid").n, mock, repo);
    expect(res).toEqual({ status: 200, result: "paid" });
    expect(repo.confirms).toBe(1);
  });

  it("تكرار نفس الـ Webhook لا يُعالج مرتين (Idempotency)", async () => {
    const repo = fakeRepo();
    const { n } = notify("paid");
    await processNotification(n, mock, repo);
    const again = await processNotification(n, mock, repo);
    expect(again).toEqual({ status: 200, result: "duplicate_event" });
    expect(repo.confirms).toBe(1);
  });

  it("حدث جديد لنفس الدفعة لا يُصدر تذاكر مرة أخرى (already_paid من قاعدة البيانات)", async () => {
    const repo = fakeRepo();
    await processNotification(notify("paid").n, mock, repo);
    const second = await processNotification(notify("paid").n, mock, repo);
    expect(second).toEqual({ status: 200, result: "already_paid" });
  });

  it("Webhook بتوقيع غير صالح يُرفض ولا يمس الطلب", async () => {
    const repo = fakeRepo();
    const { body } = notify("paid");
    const forged = mock.verifyRaw(body.replace("30000", "1"), signPayload(body, SECRET))!;
    expect(forged.signatureValid).toBe(false);
    const res = await processNotification(forged, mock, repo);
    expect(res).toEqual({ status: 401, result: "invalid_signature" });
    expect(repo.confirms).toBe(0);
  });

  it("مبلغ غير صحيح يُرفض ويُعلَّم فاشلًا دون إصدار تذاكر", async () => {
    const repo = fakeRepo({ amountFils: 30_000 });
    const res = await processNotification(notify("paid", 29_999).n, mock, repo);
    expect(res).toEqual({ status: 409, result: "amount_mismatch" });
    expect(repo.confirms).toBe(0);
    expect(repo.failed).toEqual([{ status: "failed", reason: "amount_mismatch" }]);
  });

  it("فشل الدفع وإلغاؤه لا يصدران تذاكر", async () => {
    const repo = fakeRepo();
    expect(await processNotification(notify("failed").n, mock, repo)).toEqual({
      status: 200,
      result: "failed",
    });
    expect(await processNotification(notify("cancelled").n, mock, repo)).toEqual({
      status: 200,
      result: "cancelled",
    });
    expect(repo.confirms).toBe(0);
    expect(repo.failed.map((f) => f.status)).toEqual(["failed", "cancelled"]);
  });

  it("الدفع المتأخر بعد انتهاء الحجز: النتيجة من قاعدة البيانات (استرجاع عند نفاد الكمية)", async () => {
    const repo = fakeRepo({ confirmResults: ["needs_refund"] });
    expect(await processNotification(notify("paid").n, mock, repo)).toEqual({
      status: 200,
      result: "needs_refund",
    });
  });

  it("دفعة غير معروفة أو من مزوّد آخر", async () => {
    const { body } = mock.buildWebhook({
      payment_id: "33333333-3333-4333-8333-333333333333",
      session_id: "x",
      status: "paid",
      amount_fils: 1,
      currency: "KWD",
    });
    const unknown = mock.verifyRaw(body, signPayload(body, SECRET))!;
    expect(await processNotification(unknown, mock, fakeRepo())).toEqual({
      status: 400,
      result: "unknown_payment",
    });
    expect(await processNotification(notify("paid").n, mock, fakeRepo({ provider: "myfatoorah" }))).toEqual({
      status: 409,
      result: "provider_mismatch",
    });
  });
});

describe("MyFatoorah (بمحاكاة fetch — لم يُختبر مع الخادم الحقيقي)", () => {
  const statusResponse = (InvoiceStatus: string, value = 30, fee = "0.250") => ({
    IsSuccess: true,
    Data: {
      InvoiceId: 987,
      InvoiceStatus,
      InvoiceValue: value,
      CustomerReference: PAYMENT_ID,
      UserDefinedField: ORDER_ID,
      InvoiceTransactions: [{ PaymentId: "pay-1", TransactionStatus: "Succss", TotalServiceCharge: fee }],
    },
  });

  it("إنشاء الجلسة يرسل المبلغ من الخادم ومرجع الدفعة", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            IsSuccess: true,
            Data: { InvoiceId: 987, InvoiceURL: "https://apitest.myfatoorah.com/x" },
          }),
        ),
    );
    const mf = createMyFatoorahProvider({
      apiKey: "k",
      baseUrl: "https://apitest.myfatoorah.com/",
      fetch: fetchMock as never,
    });
    const res = await mf.createSession({
      paymentId: PAYMENT_ID,
      orderId: ORDER_ID,
      orderNumber: "EP-1",
      amountFils: 45_500,
      currency: "KWD",
      locale: "ar",
      customerName: "عميل",
      customerEmail: "c@example.com",
      callbackUrl: "https://site/cb",
      errorUrl: "https://site/err",
    });
    expect(res).toEqual({
      sessionId: "987",
      invoiceId: "987",
      redirectUrl: "https://apitest.myfatoorah.com/x",
    });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://apitest.myfatoorah.com/v2/SendPayment");
    const body = JSON.parse(init.body as string);
    expect(body.InvoiceValue).toBe(45.5);
    expect(body.CustomerReference).toBe(PAYMENT_ID);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer k");
  });

  it("الحالة تُؤخذ من GetPaymentStatus وليس من جسم الـ Webhook", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(statusResponse("Pending"))));
    const mf = createMyFatoorahProvider({
      apiKey: "k",
      baseUrl: "https://apitest.myfatoorah.com",
      fetch: fetchMock as never,
    });
    const repo = fakeRepo({ provider: "myfatoorah" });
    // إشعار يدّعي النجاح، لكن MyFatoorah تقول Pending
    const res = await processNotification(
      {
        provider: "myfatoorah",
        eventId: "ev1",
        eventType: "PAYMENT_STATUS_CHANGED",
        signatureValid: false,
        payload: { Data: { Invoice: { Id: 987, Status: "PAID" } } },
      },
      mf,
      repo,
    );
    expect(res).toEqual({ status: 200, result: "pending" });
    expect(repo.confirms).toBe(0);
  });

  it("دفعة مؤكدة من MyFatoorah: المبلغ والرسوم", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(statusResponse("Paid", 30, "0.250"))));
    const mf = createMyFatoorahProvider({
      apiKey: "k",
      baseUrl: "https://apitest.myfatoorah.com",
      fetch: fetchMock as never,
    });
    const repo = fakeRepo({ provider: "myfatoorah", amountFils: 30_000 });
    const res = await processNotification(
      {
        provider: "myfatoorah",
        eventId: "ev2",
        eventType: "callback",
        signatureValid: false,
        payload: { paymentId: "pay-1" },
      },
      mf,
      repo,
    );
    expect(res).toEqual({ status: 200, result: "paid" });
    expect(repo.fee).toBe(250);
  });
});
