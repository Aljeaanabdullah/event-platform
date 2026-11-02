import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { hasTestAccounts, login, testUsers } from "./helpers";

/**
 * Phase 7 — الحجز، التذاكر الإلكترونية، والتحقق عند الدخول.
 * على بيانات is_test فقط. الاختبارات التي تغيّر المخزون تعمل في مشروع chromium فقط
 * (حتى لا يتداخل حد الطلبات المعلّقة لنفس الحساب بين مشروعين متوازيين).
 */
test.skip(!hasTestAccounts(), "E2E_TEST_PASSWORD غير مضبوط — حسابات الاختبار غير متاحة");
test.describe.configure({ mode: "serial" });

const FAMILY_DAY = "e2e00000-0000-4000-8000-0000000000e2"; // مجانية
const TECH_FORUM = "e2e00000-0000-4000-8000-0000000000e1"; // مدفوعة

const ticketRow = (page: Page, name: string) => page.getByTestId("ticket-type").filter({ hasText: name });

let ticketUrl = "";
let ticketCode = "";

test("الزائر يُحوَّل لتسجيل الدخول عند الحجز", async ({ page }) => {
  await page.goto("/en/events/e2e-family-day");
  await ticketRow(page, "Free entry").getByRole("button", { name: "Increase Free entry" }).click();
  await page.getByTestId("book-button").click();
  await expect(page).toHaveURL(/\/en\/login\?next=%2Fen%2Fevents%2Fe2e-family-day$/);
});

test("حجز مجاني: تأكيد فوري وتذاكر برمز QR فريد", async ({ page }, info) => {
  test.skip(info.project.name !== "chromium", "يغيّر المخزون — مشروع واحد");
  await login(page, testUsers.customer, "/en/events/e2e-family-day");
  const row = ticketRow(page, "Free entry");
  await row.getByRole("button", { name: "Increase Free entry" }).click();
  await row.getByRole("button", { name: "Increase Free entry" }).click();
  await expect(row.getByTestId("ticket-qty")).toHaveText("2");
  await expect(page.getByTestId("booking-estimate")).toHaveText("Free");
  await page.getByTestId("book-button").click();

  await expect(page).toHaveURL(/\/en\/account\/orders\/[0-9a-f-]{36}\?booked=1$/, { timeout: 20_000 });
  await expect(page.getByTestId("order-status")).toHaveText("Confirmed");
  await expect(page.getByTestId("order-total")).toHaveText("KWD 0.000");
  const tickets = page.getByTestId("order-tickets").getByRole("link");
  await expect(tickets).toHaveCount(2);

  await tickets.first().click();
  await expect(page.getByTestId("e-ticket")).toBeVisible();
  await expect(page.getByTestId("ticket-qr").locator("svg")).toBeVisible();
  await expect(page.getByTestId("ticket-status")).toHaveText("Valid");
  ticketCode = (await page.getByTestId("ticket-code").textContent())!.trim();
  expect(ticketCode).toMatch(/^T-[0-9A-F]{10}$/);
  ticketUrl = page.url();

  // التذكرتان برمزين مختلفين
  await page.goBack();
  await tickets.nth(1).click();
  await expect(page.getByTestId("ticket-code")).not.toHaveText(ticketCode);

  // تظهر في "تذاكري"
  await page.goto("/en/account/tickets");
  await expect(page.getByTestId("tickets-list").first()).toContainText(ticketCode);
});

test("لا يمكن لمستخدم آخر فتح تذكرة أو طلب غيره", async ({ page }, info) => {
  test.skip(info.project.name !== "chromium" || !ticketUrl, "يعتمد على التذكرة المنشأة أعلاه");
  await login(page, testUsers.customer2);
  const res = await page.goto(ticketUrl);
  expect(res?.status()).toBe(404);
});

test("التحقق عند الدخول: صالحة ثم مستخدمة، وفعالية أخرى، ومنظّم آخر", async ({ page }, info) => {
  test.skip(info.project.name !== "chromium" || !ticketCode, "يعتمد على التذكرة المنشأة أعلاه");
  await login(page, testUsers.organizer, "/en/organizer");

  // فعالية أخرى لنفس المنظّم => wrong_event (لا تُستهلك التذكرة)
  await page.goto(`/en/organizer/check-in?event=${TECH_FORUM}`);
  await page.getByLabel("Ticket code").fill(ticketCode);
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await expect(page.getByTestId("checkin-result").locator("[data-result]")).toHaveAttribute(
    "data-result",
    "wrong_event",
  );

  await page.goto(`/en/organizer/check-in?event=${FAMILY_DAY}`);
  await page.getByLabel("Ticket code").fill(ticketCode.toLowerCase());
  await page.getByRole("button", { name: "Check", exact: true }).click();
  const result = page.getByTestId("checkin-result").locator("[data-result]");
  await expect(result).toHaveAttribute("data-result", "ok");
  await expect(result).toContainText("Entry allowed");

  // المسح الثاني => مستخدمة مسبقًا (ننتظر انتهاء فترة منع التكرار)
  await page.waitForTimeout(2700);
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await expect(result).toHaveAttribute("data-result", "already_used");

  // رمز غير موجود
  await page.getByLabel("Ticket code").fill("T-0000000000");
  await page.waitForTimeout(2700);
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await expect(result).toHaveAttribute("data-result", "invalid");

  // منظّم جهة أخرى لا يستطيع التحقق من تذاكر هذه الجهة
  await page.context().clearCookies();
  await login(page, testUsers.organizer2, "/en/organizer");
  await page.goto("/en/organizer/check-in?event=e2e00000-0000-4000-8000-0000000000e4");
  await page.getByLabel("Ticket code").fill(ticketCode);
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await expect(page.getByTestId("checkin-result").locator("[data-result]")).toHaveAttribute(
    "data-result",
    "invalid",
  );

  // المالك يرى التذكرة "مستخدمة" بدون رمز QR
  await page.context().clearCookies();
  await login(page, testUsers.customer);
  await page.goto(ticketUrl);
  await expect(page.getByTestId("ticket-status")).toHaveText("Used");
  await expect(page.getByTestId("ticket-qr")).toHaveCount(0);
});

test("حجز مدفوع: حجز مؤقت 15 دقيقة، إجمالي من الخادم، ثم الإلغاء يحرر التذاكر", async ({ page }, info) => {
  test.skip(info.project.name !== "chromium", "يغيّر المخزون — مشروع واحد");
  await login(page, testUsers.customer, "/en/events/e2e-tech-forum");
  const general = ticketRow(page, "General");
  const before = Number((await general.textContent())!.match(/(\d+) seats? left/)![1]);
  await general.getByRole("button", { name: "Increase General" }).click();
  await general.getByRole("button", { name: "Increase General" }).click();
  await expect(page.getByTestId("booking-estimate")).toHaveText("KWD 30.000");
  await page.getByTestId("book-button").click();

  await expect(page).toHaveURL(/\/en\/checkout\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  const checkoutUrl = page.url();
  await expect(page.getByTestId("order-total")).toHaveText("KWD 30.000");
  await expect(page.getByTestId("hold-countdown")).toContainText(/held for 1[45]:\d\d/);

  // الكمية محجوزة فعلًا (تنقص من المتاح)
  await page.goto("/en/events/e2e-tech-forum");
  await expect
    .poll(
      async () => {
        await page.reload();
        return Number((await ticketRow(page, "General").textContent())!.match(/(\d+) seats? left/)![1]);
      },
      { timeout: 90_000, intervals: [3_000] },
    )
    .toBe(before - 2);

  await page.goto(checkoutUrl);
  await page.getByRole("button", { name: "Cancel booking" }).click();
  await expect(page).toHaveURL(/\/en\/account\/orders\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  await expect(page.getByTestId("order-status")).toHaveText("Cancelled");
});

test("فعالية مكتملة: لا يمكن الحجز", async ({ page }) => {
  await page.goto("/en/events/e2e-sold-out-workshop");
  await expect(page.getByTestId("event-status")).toHaveText("Sold out");
  await expect(page.getByTestId("book-button")).toHaveCount(0);
});

test("حد الطلبات المعلّقة لكل مستخدم (3)", async ({ page }, info) => {
  test.skip(info.project.name !== "chromium", "يغيّر المخزون — مشروع واحد");
  test.setTimeout(120_000);
  await login(page, testUsers.customer2, "/en/events/e2e-marathon");
  // تنظيف مسبق: إلغاء أي طلبات معلّقة متبقية من تشغيل سابق متعثر
  await page.goto("/en/account/orders");
  const pendingLinks = page
    .getByTestId("orders-list")
    .getByRole("link")
    .filter({ hasText: "Awaiting payment" });
  for (const href of await pendingLinks.evaluateAll((els) => els.map((e) => e.getAttribute("href")!))) {
    await page.goto(href);
    await page.getByRole("button", { name: "Cancel booking" }).click();
    await expect(page.getByTestId("order-status")).toHaveText("Cancelled", { timeout: 20_000 });
  }
  const created: string[] = [];
  for (let i = 0; i < 4; i++) {
    await page.goto("/en/events/e2e-marathon");
    await ticketRow(page, "Runner").getByRole("button", { name: "Increase Runner" }).click();
    await page.getByTestId("book-button").click();
    if (i < 3) {
      await expect(page).toHaveURL(/\/en\/checkout\/[0-9a-f-]{36}$/, { timeout: 20_000 });
      created.push(page.url());
    } else {
      await expect(page.getByTestId("event-details").getByRole("alert")).toContainText(
        "too many pending bookings",
      );
    }
  }
  // تنظيف: إلغاء الحجوزات
  for (const url of created) {
    await page.goto(url);
    await page.getByRole("button", { name: "Cancel booking" }).click();
    await expect(page.getByTestId("order-status")).toHaveText("Cancelled", { timeout: 20_000 });
  }
});

test("إمكانية الوصول — التذكرة والطلبات والتحقق", async ({ page }) => {
  await login(page, testUsers.customer, "/en/account/tickets");
  for (const path of ["/en/account/tickets", "/ar/account/orders"]) {
    await page.goto(path);
    await page.getByRole("heading", { level: 1 }).waitFor();
    const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const serious = res.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(
      serious.map((v) => `${path} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
    ).toEqual([]);
  }
});
