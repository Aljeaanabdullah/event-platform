import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { hasTestAccounts, login, testUsers } from "./helpers";

/**
 * شارات حالة الدفع والتحديث المباشر في لوحة الإدارة.
 * حساب المدير موجود في قاعدة التطوير فقط، ويُحدَّد عبر E2E_ADMIN_EMAIL.
 */
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

test.skip(!hasTestAccounts(), "E2E_TEST_PASSWORD غير مضبوط");

test("غير المدير لا يصل لصفحة المدفوعات", async ({ page }) => {
  await login(page, testUsers.customer);
  expect((await page.goto("/en/admin/payments"))?.status()).toBe(404);
});

test("الشارة تتغير مباشرة بدون إعادة تحميل الصفحة", async ({ page }, info) => {
  test.skip(!adminEmail || info.project.name !== "chromium", "يحتاج E2E_ADMIN_EMAIL ومشروعًا واحدًا");
  test.setTimeout(60_000);

  await login(page, adminEmail!, "/en/admin/payments");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Payments");
  // ننتظر اشتراك Realtime قبل إنشاء الطلب
  await page.waitForTimeout(3000);

  const auth = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ email: testUsers.customer, password: process.env.E2E_TEST_PASSWORD }),
  }).then((r) => r.json());
  const rest = (path: string, body?: unknown) =>
    fetch(`${url}/rest/v1/${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        apikey: key,
        Authorization: `Bearer ${auth.access_token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

  const [event] = await rest("events?slug=eq.e2e-marathon&select=id,ticket_types(id)").then((r) => r.json());
  const [order] = await rest("rpc/reserve_tickets", {
    p_event_id: event.id,
    p_items: [{ ticket_type_id: event.ticket_types[0].id, quantity: 1 }],
    p_locale: "en",
  }).then((r) => r.json());

  const badge = page
    .locator(`[data-testid="admin-payment-row"][data-order="${order.order_number}"]`)
    .getByTestId("payment-state");
  await expect(badge).toHaveAttribute("data-state", "pending", { timeout: 15_000 });

  await rest("rpc/cancel_pending_order", { p_order_id: order.order_id });
  await expect(badge).toHaveAttribute("data-state", "cancelled", { timeout: 15_000 });

  for (const theme of ["light", "dark"]) {
    await page
      .getByRole("button", { name: theme === "light" ? "Light" : "Dark" })
      .first()
      .click();
    const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = res.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(
      serious.map((v) => `${theme} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
    ).toEqual([]);
  }
});
