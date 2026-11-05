import { expect, type Page } from "@playwright/test";

/**
 * حسابات الاختبار المعزولة (supabase/seed/test-data.sql — is_test فقط، بدون مدير).
 * كلمة المرور من .env.local (E2E_TEST_PASSWORD) ولا تُحفظ في Git.
 */
export const testUsers = {
  customer: "e2e-customer@example.test",
  customer2: "e2e-customer2@example.test",
  organizer: "e2e-organizer@example.test",
  organizer2: "e2e-organizer2@example.test",
} as const;

export const hasTestAccounts = () => !!process.env.E2E_TEST_PASSWORD;

export async function login(page: Page, email: string, next = "/en/account") {
  await page.goto(`/en/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(process.env.E2E_TEST_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(next.replace(/[?]/g, "\\?")), { timeout: 20_000 });
}

/** صورة PNG صغيرة صالحة (1×1) للاختبار */
export const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);
