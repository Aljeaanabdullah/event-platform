import { expect, test } from "@playwright/test";

test("ترويسات الأمان موجودة", async ({ request }) => {
  const response = await request.get("/ar");
  const headers = response.headers();

  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("صفحات التطوير (بيانات تجريبية) غير متاحة في الإنتاج", async ({ page }) => {
  for (const path of ["/ar/dev/ui", "/en/dev/home-preview"]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
  }
});
