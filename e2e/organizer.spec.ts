import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { hasTestAccounts, login, testUsers, tinyPng } from "./helpers";

/**
 * Phase 6 — لوحة المنظّم، معالج إنشاء الفعالية، والصلاحيات.
 * يعمل على حسابات وجهات is_test فقط. الفعاليات المنشأة هنا تُحذف في نهاية الاختبار.
 * مسار اعتماد المدير يُختبر في supabase/tests (لا يوجد حساب مدير في بيانات الاختبار عمدًا).
 */
test.skip(!hasTestAccounts(), "E2E_TEST_PASSWORD غير مضبوط — حسابات الاختبار غير متاحة");
test.describe.configure({ mode: "serial" });

const OTHER_ORG_EVENT = "e2e00000-0000-4000-8000-0000000000e4"; // ماراثون — تابعة للجهة الأخرى

test("لوحة المنظّم تعرض أرقامًا حقيقية وفعاليات الجهة فقط", async ({ page }) => {
  await login(page, testUsers.organizer, "/en/organizer");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Test Organizer dashboard");
  const stats = page.getByTestId("organizer-stats");
  await expect(stats).toContainText("Total events");
  await expect(stats).toContainText("KWD");

  await page.goto("/en/organizer/events");
  const table = page.getByTestId("organizer-events-table");
  await expect(table).toContainText("Kuwait Tech Forum (Test)");
  // فعاليات الجهة الأخرى لا تظهر
  await expect(table).not.toContainText("Ahmadi Marathon (Test)");
});

test("لا يستطيع المنظّم فتح فعالية جهة أخرى، والعميل لا يصل لأدوات المنظّم أو الإدارة", async ({ page }) => {
  await login(page, testUsers.organizer, "/en/organizer");
  const res = await page.goto(`/en/organizer/events/${OTHER_ORG_EVENT}`);
  expect(res?.status()).toBe(404);

  await page.context().clearCookies();
  await login(page, testUsers.customer);
  for (const path of ["/en/organizer/events/new", "/en/admin", "/en/admin/events", "/en/admin/organizers"]) {
    const r = await page.goto(path);
    expect(r?.status(), path).toBe(404);
  }
});

test("معالج إنشاء الفعالية: التحقق، الصور، المسودة، الإرسال، السحب، الحذف", async ({ page }) => {
  test.setTimeout(120_000);
  // عنوان فريد لكل مشروع (سطح المكتب/الجوال يعملان بالتوازي)
  const title = `Automated Test Workshop ${test.info().project.name} ${Date.now()} (Test)`;
  await login(page, testUsers.organizer, "/en/organizer");
  await page.goto("/en/organizer/events/new");
  const wizard = page.getByTestId("event-wizard");

  // الخطوة 1: التحقق من الحقول المطلوبة
  await wizard.getByRole("button", { name: "Next" }).click();
  await expect(wizard.getByText("Title is too short (at least 3 characters)").first()).toBeVisible();
  await wizard.getByLabel("Category").selectOption("workshops");
  await wizard.getByLabel("Title (Arabic)").fill("ورشة اختبار آلي (تجريبية)");
  await wizard.getByLabel("Title (English)").fill(title);
  await wizard.getByLabel("Short summary (English)").fill("Created by an automated E2E test");
  await wizard.getByRole("button", { name: "Next" }).click();

  // الخطوة 2: رفع صورة إلى Supabase Storage (سياسة الحاوية تسمح لأعضاء الجهة فقط)
  await page
    .getByTestId("image-input")
    .setInputFiles({ name: "cover.png", mimeType: "image/png", buffer: tinyPng });
  await expect(page.getByTestId("uploaded-images").locator("li")).toHaveCount(1, { timeout: 20_000 });
  await expect(page.getByTestId("uploaded-images")).toContainText("Cover");
  await wizard.getByRole("button", { name: "Next" }).click();

  // الخطوة 3: التاريخ — النهاية قبل البداية مرفوضة
  const future = new Date(Date.now() + 40 * 86_400_000).toISOString().slice(0, 10);
  await wizard.getByLabel("Starts").fill(`${future}T19:00`);
  await wizard.getByLabel("Ends").fill(`${future}T18:00`);
  await wizard.getByRole("button", { name: "Next" }).click();
  await expect(wizard.getByText("End must be after the start")).toBeVisible();
  await wizard.getByLabel("Ends").fill(`${future}T22:00`);
  await wizard.getByRole("button", { name: "Next" }).click();

  // الخطوة 4: الموقع
  await wizard.getByLabel("Governorate").selectOption("hawalli");
  await wizard.getByLabel("Venue name (English)").fill("Test Hall");
  await wizard.getByRole("button", { name: "Next" }).click();

  // الخطوة 5: التذاكر — سعر غير صالح ثم مجانية ومدفوعة
  await wizard.getByRole("button", { name: "Add ticket type" }).click();
  await wizard.getByLabel("Ticket name (Arabic)").first().fill("عادية");
  await wizard.getByLabel("Ticket name (English)").first().fill("General");
  await wizard.getByLabel("Price (KWD)").first().fill("5.1234");
  await wizard.getByLabel("Quantity").first().fill("40");
  await wizard.getByRole("button", { name: "Next" }).click();
  await expect(wizard.getByText("Invalid price (e.g. 7.500)")).toBeVisible();
  await wizard.getByLabel("Price (KWD)").first().fill("5.250");
  await wizard.getByRole("button", { name: "Add ticket type" }).click();
  await wizard.getByLabel("Ticket name (Arabic)").nth(1).fill("مجانية");
  await wizard.getByLabel("Ticket name (English)").nth(1).fill("Free");
  await wizard.getByLabel("Price (KWD)").nth(1).fill("0");
  await wizard.getByLabel("Quantity").nth(1).fill("10");
  await expect(page.getByTestId("total-capacity")).toHaveText("Total capacity (max attendees): 50");
  await wizard.getByRole("button", { name: "Next" }).click();

  // الخطوة 6: المعاينة
  await expect(wizard.getByText(title).first()).toBeVisible();
  await expect(wizard.getByText("KWD 5.250").first()).toBeVisible();

  // حفظ مسودة => رابط الفعالية
  await wizard.getByRole("button", { name: "Save draft" }).click();
  await expect(page).toHaveURL(/\/en\/organizer\/events\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  const eventUrl = page.url();
  await expect(page.getByTestId("event-status-badge")).toHaveText("Draft");

  // البيانات محفوظة فعلًا (إعادة تحميل)
  await page.reload();
  await page.getByRole("button", { name: /5\. Tickets & prices/ }).click();
  await expect(page.getByLabel("Price (KWD)").first()).toHaveValue("5.250");
  await expect(page.getByTestId("total-capacity")).toHaveText("Total capacity (max attendees): 50");

  // الخطوة 7: الإرسال للمراجعة
  await page.getByRole("button", { name: /7\. Submit for review/ }).click();
  await expect(page.getByTestId("readiness").locator("li")).toHaveCount(3);
  await page.getByRole("button", { name: "Submit for review", exact: true }).click();
  await expect(page.getByTestId("event-status-badge")).toHaveText("Under review", { timeout: 20_000 });
  expect(page.url()).toBe(eventUrl);

  // لا تظهر للعامة قبل الاعتماد
  await page.goto(`/en/events?q=${encodeURIComponent(title)}`);
  await expect(page.getByText("No matching events").first()).toBeVisible();

  // سحب من المراجعة ثم حذف المسودة (تنظيف)
  await page.goto(eventUrl);
  await page.getByRole("button", { name: "Withdraw from review" }).click();
  await expect(page.getByTestId("event-status-badge")).toHaveText("Draft", { timeout: 20_000 });
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete draft" }).click();
  await expect(page).toHaveURL(/\/en\/organizer\/events$/, { timeout: 20_000 });
  await expect(page.getByTestId("organizer-events-table")).not.toContainText(title);
});

test("لا يمكن تعديل فعالية قيد المراجعة من المعالج", async ({ page }) => {
  await login(page, testUsers.organizer, "/en/organizer");
  await page.goto("/en/organizer/events/e2e00000-0000-4000-8000-0000000000e7");
  await expect(page.getByTestId("event-status-badge")).toHaveText("Under review");
  await expect(page.getByTestId("event-wizard")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Withdraw from review" })).toBeVisible();
});

test("إمكانية الوصول — لوحة المنظّم والمعالج", async ({ page }) => {
  await login(page, testUsers.organizer, "/en/organizer");
  for (const path of ["/en/organizer", "/ar/organizer/events/new"]) {
    await page.goto(path);
    // الصفحات المسجّلة تُبقي اتصالًا مفتوحًا (الإشعارات) فلا نعتمد على networkidle
    await page.getByRole("heading", { level: 1 }).waitFor();
    await page.waitForTimeout(800);
    const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const serious = res.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(
      serious.map((v) => `${path} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
    ).toEqual([]);
  }
});
