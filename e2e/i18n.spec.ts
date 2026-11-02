import { expect, test } from "@playwright/test";

test.describe("اللغة والاتجاه", () => {
  test.describe("زائر عربي", () => {
    test.use({ locale: "ar-KW" });
    test("الجذر يوجّه إلى /ar حسب لغة المتصفح", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveURL(/\/ar$/);
    });
  });

  test.describe("زائر إنجليزي", () => {
    test.use({ locale: "en-US" });
    test("الجذر يوجّه إلى /en حسب لغة المتصفح", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveURL(/\/en$/);
    });
  });

  test("العربية: RTL ونصوص عربية", async ({ page }) => {
    await page.goto("/ar");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("اكتشف");
    await expect(page).toHaveTitle(/الكويت/);
  });

  test("الإنجليزية: LTR ونصوص إنجليزية", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Discover");
  });

  test("hreflang للغتين", async ({ page }) => {
    await page.goto("/ar");
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute("href", /\/en$/);
    await expect(page.locator('link[rel="alternate"][hreflang="ar"]')).toHaveAttribute("href", /\/ar$/);
  });

  test("تبديل اللغة يحافظ على الصفحة والفلاتر ويُحفظ للزيارة القادمة", async ({ page, isMobile }) => {
    await page.goto("/ar/events?category=music");
    if (isMobile) {
      await page.getByRole("button", { name: "فتح القائمة" }).click();
      await page.getByRole("dialog").getByTestId("locale-switcher").click();
    } else {
      await page.getByRole("banner").getByTestId("locale-switcher").click();
    }
    await expect(page).toHaveURL(/\/en\/events\?category=music$/);
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.getByTestId("active-filters").getByText("Music", { exact: true })).toBeVisible();

    await page.goto("/");
    await expect(page).toHaveURL(/\/en$/);
  });

  test("صفحة 404 مترجمة لكل لغة", async ({ page }) => {
    const ar = await page.goto("/ar/no-such-page");
    expect(ar?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("الصفحة غير موجودة");

    const en = await page.goto("/en/no-such-page");
    expect(en?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");
  });
});
