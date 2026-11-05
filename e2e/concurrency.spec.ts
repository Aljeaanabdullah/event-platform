import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import { hasTestAccounts, testUsers } from "./helpers";

/**
 * منع البيع الزائد تحت ضغط متزامن حقيقي — على قاعدة Postgres الفعلية (وليس محاكاة):
 * مستخدمان حقيقيان (حسابا اختبار) يرسلان 6 طلبات حجز متوازية لنفس نوع التذكرة (VIP: 20 مقعدًا،
 * 4 لكل طلب = 24 مطلوبة). reserve_tickets تقفل الصفوف (FOR UPDATE) ويجب ألا يتجاوز المحجوز المتاح.
 * لا يحتاج المفتاح السري: يستخدم المفتاح العام + تسجيل دخول حقيقي، و RLS مفعّلة.
 * في النهاية تُلغى كل الطلبات المنشأة فتعود الكمية كما كانت.
 */
test.skip(!hasTestAccounts(), "E2E_TEST_PASSWORD غير مضبوط");

const EVENT_ID = "e2e00000-0000-4000-8000-0000000000e1";

test("6 طلبات متوازية على 20 مقعدًا لا تتجاوز السعة", async ({}, info) => {
  test.skip(info.project.name !== "chromium", "اختبار قاعدة بيانات — مرة واحدة");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const sessionFor = async (email: string) => {
    const client = createClient(url, key, { auth: { persistSession: false } });
    const { error } = await client.auth.signInWithPassword({
      email,
      password: process.env.E2E_TEST_PASSWORD!,
    });
    expect(error).toBeNull();
    return client;
  };
  const [a, b] = await Promise.all([sessionFor(testUsers.customer), sessionFor(testUsers.customer2)]);

  const availableVip = async () => {
    const { data } = await a.rpc("get_event_details", { p_slug: "e2e-tech-forum", p_include_test: true });
    const vip = (
      data as { ticket_types: { id: string; name_en: string; available: number }[] }
    ).ticket_types.find((t) => t.name_en === "VIP")!;
    return vip;
  };
  const vip = await availableVip();
  test.skip(vip.available < 4, "المخزون غير كافٍ للاختبار");

  const attempt = (client: typeof a) =>
    client.rpc("reserve_tickets", {
      p_event_id: EVENT_ID,
      p_items: [{ ticket_type_id: vip.id, quantity: 4 }],
    });
  const results = await Promise.all([attempt(a), attempt(a), attempt(a), attempt(b), attempt(b), attempt(b)]);

  const succeeded = results.filter((r) => !r.error).map((r) => r.data![0]!);
  const failures = results.filter((r) => r.error).map((r) => r.error!.message);
  try {
    const after = await availableVip();
    // القاعدة الذهبية: المحجوز = ما نقص من المتاح، ولم يتجاوز المتاح قبل البدء
    expect(succeeded.length * 4).toBe(vip.available - after.available);
    expect(succeeded.length * 4).toBeLessThanOrEqual(vip.available);
    expect(after.available).toBeGreaterThanOrEqual(0);
    // كل فشل سببه معروف (نفاد أو حد الطلبات المعلّقة) — لا أخطاء قفل/تزامن
    for (const message of failures) expect(["SOLD_OUT", "TOO_MANY_PENDING_ORDERS"]).toContain(message);
    if (vip.available >= 24) expect(succeeded.length).toBe(6);
    else expect(failures).toContain("SOLD_OUT");
  } finally {
    // تنظيف: إلغاء الطلبات يحرر المقاعد
    for (const order of succeeded) {
      const owner = results.findIndex((r) => r.data?.[0]?.order_id === order.order_id) < 3 ? a : b;
      await owner.rpc("cancel_pending_order", { p_order_id: order.order_id });
    }
  }
  const restored = await availableVip();
  expect(restored.available).toBe(vip.available);
});
