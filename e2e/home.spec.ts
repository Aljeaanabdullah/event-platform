import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("الصفحة الرئيسية", () => {
  test("لا أخطاء في الكونسول، والمجسم ثلاثي الأبعاد يُحمَّل أو يظهر بديله", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

    await page.goto("/ar");
    const visual = page.getByTestId("hero-visual");
    await expect(visual).toHaveAttribute("data-mode", /^(3d|static)$/, { timeout: 20_000 });
    // البديل الثابت موجود دائمًا في الصفحة (يظهر أثناء التحميل أو عند عدم دعم WebGL)
    await expect(page.getByTestId("ticket-fallback")).toBeAttached();
    expect(errors).toEqual([]);
  });

  test.describe("مع تقليل الحركة", () => {
    test.use({ reducedMotion: "reduce" });
    test("يُعرض البديل الثابت بدل WebGL ويظهر المحتوى مباشرة", async ({ page }) => {
      await page.goto("/en");
      await expect(page.getByTestId("hero-visual")).toHaveAttribute("data-mode", "static", {
        timeout: 20_000,
      });
      await expect(page.locator("canvas")).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "Browse by category" })).toBeVisible();
    });
  });

  test("بحث الـ Hero ينقل إلى صفحة الفعاليات", async ({ page }) => {
    await page.goto("/ar");
    await page.getByLabel("ابحث بالاسم", { exact: true }).fill("جاز");
    await page.getByRole("button", { name: "ابحث", exact: true }).click();

    await expect(page).toHaveURL(/\/ar\/events\?/);
    expect(new URL(page.url()).searchParams.get("q")).toBe("جاز");
    // لا توجد فعاليات منشورة بعد: حالة فارغة صادقة بدل نتائج وهمية
    await expect(page.getByText("لا توجد فعاليات مطابقة")).toBeVisible();
  });

  test("بلاطات التصنيفات في الـ Hero روابط حقيقية بحالة نشطة", async ({ page }) => {
    await page.goto("/ar");
    const tiles = page.getByRole("navigation", { name: "تصفّح حسب التصنيف" });
    await expect(tiles.getByRole("link", { name: "الكل" })).toHaveAttribute("aria-current", "page");
    await tiles.getByRole("link", { name: "موسيقى" }).click();
    await expect(page).toHaveURL(/\/ar\/events\?category=music$/);
    await expect(page.getByText("موسيقى", { exact: true })).toBeVisible();
  });

  test("الفعاليات المميزة وشريط الإحصائيات بلا بيانات وهمية", async ({ page }) => {
    await page.goto("/ar");
    // لا توجد فعاليات منشورة: حالة فارغة داخل القسم، والشريط يعرض المزايا بدل أرقام صفرية
    const featured = page.getByRole("region", { name: "فعاليات مميزة" });
    await featured.scrollIntoViewIfNeeded();
    await expect(featured.getByText("لا توجد فعاليات منشورة بعد")).toBeVisible();
    await expect(page.getByTestId("stats-bar")).toHaveAttribute("data-mode", "features");
  });

  test("التصنيفات تظهر عند التمرير وتربط بصفحة الفعاليات", async ({ page }) => {
    await page.goto("/en");
    const link = page.getByRole("link", { name: "Tech & AI" });
    await link.scrollIntoViewIfNeeded();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/en/events?category=tech-ai");
  });

  for (const locale of ["ar", "en"] as const) {
    test(`لا يوجد تمرير أفقي (${locale})`, async ({ page }) => {
      await page.goto(`/${locale}`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test("قائمة الجوال تفتح وتحتوي روابط التنقل", async ({ page, isMobile }) => {
    test.skip(!isMobile, "خاص بالجوال");
    await page.goto("/ar");
    await page.getByRole("button", { name: "فتح القائمة" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("link", { name: "الفعاليات" })).toBeVisible();
    await expect(dialog.getByRole("link", { name: "أضف فعاليتك" })).toBeVisible();
  });
});

test.describe("إمكانية الوصول (axe)", () => {
  for (const colorScheme of ["light", "dark"] as const) {
    for (const path of ["/ar", "/en", "/ar/events", "/en/no-such-page"]) {
      test(`${path} — ${colorScheme}`, async ({ page }) => {
        await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
        const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
        expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual(
          [],
        );
      });
    }
  }
});
