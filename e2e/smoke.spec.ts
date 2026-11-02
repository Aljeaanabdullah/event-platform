import { expect, test } from "@playwright/test";

test("ترويسات الأمان موجودة", async ({ request }) => {
  const response = await request.get("/ar");
  const headers = response.headers();

  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("صفحة عرض المكونات غير متاحة في الإنتاج", async ({ page }) => {
  const response = await page.goto("/ar/dev/ui");
  expect(response?.status()).toBe(404);
});
