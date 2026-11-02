import { expect, test } from "@playwright/test";

import { hasTestAccounts, login, testUsers } from "./helpers";

/**
 * Phase 8 — الدفع التجريبي (مزوّد وهمي Mock، وليس MyFatoorah الحقيقي).
 * - بدون SUPABASE_SECRET_KEY: نتحقق أن النظام يرفض المعالجة بوضوح (503 / رسالة صريحة) ولا يصدر تذاكر.
 * - مع المفتاح: مسار النجاح الكامل وإصدار التذاكر مرة واحدة.
 */
test.skip(!hasTestAccounts(), "E2E_TEST_PASSWORD غير مضبوط");
test.describe.configure({ mode: "serial" });

const hasServerKey = !!process.env.SUPABASE_SECRET_KEY;
const mockEnabled = process.env.PAYMENT_PROVIDER === "mock";

test("Webhook بلا توقيع صالح لا يُقبل", async ({ request }) => {
  const res = await request.post("/api/payments/webhook/mock", {
    data: {
      event_id: "forged",
      payment_id: "00000000-0000-4000-8000-000000000000",
      status: "paid",
      amount_fils: 1,
    },
    headers: { "x-mock-signature": "forged" },
  });
  // بدون مفتاح الخادم: 503 (لا معالجة إطلاقًا). معه: 401 (توقيع غير صالح).
  expect(res.status()).toBe(hasServerKey ? 401 : 503);
  expect((await request.post("/api/payments/webhook/paypal")).status()).toBe(404);
});

test("الدفع التجريبي: المبلغ من الخادم، صفحة مزوّد بلا بيانات بطاقة، والحالة من قاعدة البيانات", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "chromium" || !mockEnabled, "مشروع واحد + PAYMENT_PROVIDER=mock");
  test.setTimeout(120_000);
  await login(page, testUsers.customer, "/en/events/e2e-music-night");
  await page
    .getByTestId("ticket-type")
    .filter({ hasText: "General" })
    .getByRole("button", { name: "Increase General" })
    .click();
  await page.getByTestId("book-button").click();
  await expect(page).toHaveURL(/\/en\/checkout\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  const orderId = page.url().split("/").pop()!;

  await expect(page.getByTestId("sandbox-note")).toBeVisible();
  await expect(page.getByTestId("order-total")).toHaveText("KWD 8.250");

  // رابط النجاح وحده لا يثبت شيئًا: قاعدة البيانات تقول "بانتظار الدفع"
  await page.goto(`/en/checkout/${orderId}/success`);
  await expect(page).toHaveURL(new RegExp(`/en/checkout/${orderId}/status$`));
  await expect(page.getByTestId("payment-status")).toHaveAttribute("data-view", "processing");

  await page.goto(`/en/checkout/${orderId}`);
  await page.getByTestId("pay-button").click();
  await expect(page).toHaveURL(/\/en\/payments\/mock\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  const mockUrl = page.url();
  await expect(page.getByTestId("mock-amount")).toHaveText("KWD 8.250");
  // لا حقول بطاقة إطلاقًا
  await expect(page.locator("input")).toHaveCount(0);

  // مستخدم آخر لا يستطيع فتح صفحة دفع غيره
  const other = await page.context().browser()!.newContext();
  const otherPage = await other.newPage();
  await login(otherPage, testUsers.customer2);
  expect((await otherPage.goto(mockUrl))?.status()).toBe(404);
  await other.close();

  await page.getByTestId("mock-pay-success").click();
  if (!hasServerKey) {
    // بدون المفتاح السري: رسالة صريحة، ولا تأكيد ولا تذاكر
    await expect(page.getByRole("alert").filter({ hasText: "SUPABASE_SECRET_KEY" })).toBeVisible();
    await page.goto(`/en/checkout/${orderId}`);
    await expect(page.getByTestId("checkout")).toBeVisible();
    await page.getByRole("button", { name: "Cancel booking" }).click();
    await expect(page.getByTestId("order-status")).toHaveText("Cancelled", { timeout: 20_000 });
    return;
  }

  await expect(page).toHaveURL(new RegExp(`/en/checkout/${orderId}/success$`), { timeout: 20_000 });
  await page.getByRole("link", { name: "View tickets" }).click();
  await expect(page.getByTestId("order-tickets").getByRole("link")).toHaveCount(1);
  // إعادة فتح صفحة المزوّد بعد المعالجة لا تسمح بدفع ثانٍ
  await page.goto(mockUrl);
  await expect(page.getByTestId("mock-pay-success")).toHaveCount(0);
});

test("فشل الدفع ثم إلغاؤه يبقي الطلب بانتظار الدفع بلا تذاكر", async ({ page }, info) => {
  test.skip(
    info.project.name !== "chromium" || !mockEnabled || !hasServerKey,
    "يحتاج SUPABASE_SECRET_KEY لمعالجة الإشعار",
  );
  await login(page, testUsers.customer, "/en/events/e2e-music-night");
  await page
    .getByTestId("ticket-type")
    .filter({ hasText: "General" })
    .getByRole("button", { name: "Increase General" })
    .click();
  await page.getByTestId("book-button").click();
  await expect(page).toHaveURL(/\/en\/checkout\//, { timeout: 20_000 });
  const orderId = page.url().split("/").pop()!;
  await page.getByTestId("pay-button").click();
  await page.getByTestId("mock-pay-fail").click();
  await expect(page).toHaveURL(new RegExp(`/en/checkout/${orderId}/failed$`), { timeout: 20_000 });
  await page.getByRole("link", { name: "Try paying again" }).click();
  await page.getByTestId("pay-button").click();
  await page.getByTestId("mock-pay-cancel").click();
  await expect(page).toHaveURL(new RegExp(`/en/checkout/${orderId}/cancelled$`), { timeout: 20_000 });
  await page.goto(`/en/checkout/${orderId}`);
  await page.getByRole("button", { name: "Cancel booking" }).click();
  await expect(page.getByTestId("order-status")).toHaveText("Cancelled", { timeout: 20_000 });
});
