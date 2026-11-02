import { expect, test } from "@playwright/test";

/** يسجّل class عنصر <html> لحظة DOMContentLoaded — قبل تشغيل React — لاكتشاف وميض الثيم */
async function recordInitialClass(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      (window as unknown as { __initialClass: string }).__initialClass = document.documentElement.className;
    });
  });
}

test.describe("الثيم", () => {
  test.describe("جهاز بوضع داكن", () => {
    test.use({ colorScheme: "dark" });
    test("يتبع ثيم الجهاز افتراضيًا بدون وميض", async ({ page }) => {
      await recordInitialClass(page);
      await page.goto("/ar");
      const initial = await page.evaluate(
        () => (window as unknown as { __initialClass: string }).__initialClass,
      );
      expect(initial).toContain("dark");
    });
  });

  test.describe("جهاز بوضع فاتح", () => {
    test.use({ colorScheme: "light" });
    test("يتبع ثيم الجهاز افتراضيًا", async ({ page }) => {
      await page.goto("/en");
      await expect(page.locator("html")).not.toHaveClass(/dark/);
    });

    test("الاختيار المحفوظ يُطبَّق قبل الرسم ويتغلب على ثيم الجهاز", async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem("ep-theme", "dark"));
      await recordInitialClass(page);
      await page.goto("/en");
      const initial = await page.evaluate(
        () => (window as unknown as { __initialClass: string }).__initialClass,
      );
      expect(initial).toContain("dark");
    });

    test("زر تغيير الثيم يعمل ويُحفظ الاختيار بعد إعادة التحميل", async ({ page }) => {
      await page.goto("/ar");
      // على الجوال مبدّل الثيم داخل القائمة الجانبية
      const isMobile = (page.viewportSize()?.width ?? 1280) < 640;
      if (isMobile) {
        await page.getByRole("button", { name: "فتح القائمة" }).click();
        await page.getByRole("dialog").getByTestId("theme-dark").click();
      } else {
        await page.getByRole("banner").getByTestId("theme-dark").click();
      }
      await expect(page.locator("html")).toHaveClass(/dark/);

      await page.reload();
      await expect(page.locator("html")).toHaveClass(/dark/);
      expect(await page.evaluate(() => localStorage.getItem("ep-theme"))).toBe("dark");
    });
  });
});
