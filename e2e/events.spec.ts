import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Phase 5 — استكشاف الفعاليات على بيانات الاختبار المعزولة (supabase/seed/test-data.sql).
 * تعمل فقط عند SHOW_TEST_DATA=1 (محليًا)؛ في غير ذلك تُتخطى لأن الموقع العام لا يعرض بيانات اختبار.
 */
test.beforeEach(async ({ request }) => {
  const res = await request.get("/en/events/e2e-tech-forum");
  test.skip(res.status() !== 200, "بيانات الاختبار غير مفعّلة (SHOW_TEST_DATA=1 + seed)");
});

// أثناء البث (Streaming) قد توجد نسخة مخفية مؤقتة من المحتوى قبل استبدالها — نعدّ الظاهر فقط
const visibleText = (page: import("@playwright/test").Page, text: string) =>
  page.getByText(text).filter({ visible: true });

const results = (page: import("@playwright/test").Page) =>
  page.getByTestId("event-results").locator("article").filter({ visible: true });

test.describe("قائمة الفعاليات", () => {
  test("تعرض الفعاليات المنشورة فقط", async ({ page }) => {
    await page.goto("/en/events");
    await expect(results(page).first()).toBeVisible();
    await expect(visibleText(page, "Kuwait Tech Forum (Test)")).toBeVisible();
    // قيد المراجعة والمسودة لا تظهران
    await expect(page.getByText("Play Under Review (Test)")).toHaveCount(0);
    await expect(page.getByText("Draft Course (Test)")).toHaveCount(0);
  });

  test("البحث باسم المنظّم بالإنجليزية والعربية", async ({ page }) => {
    await page.goto("/en/events?q=Other+Test");
    await expect(results(page)).toHaveCount(2);
    await page.goto(`/ar/events?q=${encodeURIComponent("منظّم تجريبي آخر")}`);
    await expect(results(page)).toHaveCount(2);
  });

  test("البحث في الوصف", async ({ page }) => {
    await page.goto("/en/events?q=photography");
    await expect(results(page)).toHaveCount(1);
    await expect(visibleText(page, "Sold-out Photo Workshop (Test)")).toBeVisible();
  });

  test("الفلاتر تُحفظ في الرابط وتعمل من الواجهة", async ({ page }) => {
    await page.goto("/en/events");
    await page.getByLabel("Governorate").filter({ visible: true }).selectOption("hawalli");
    await expect(page).toHaveURL(/\/en\/events\?area=hawalli$/);
    await expect(results(page)).toHaveCount(1);
    await expect(visibleText(page, "Music Night (Test)")).toBeVisible();
    // إزالة الفلتر من الشارة
    await page.getByRole("link", { name: "Remove Hawalli" }).click();
    await expect(page).toHaveURL(/\/en\/events$/);
  });

  test("فلاتر السعر والتصنيف والفترة", async ({ page }) => {
    await page.goto("/en/events?price=free");
    await expect(results(page)).toHaveCount(1);
    await expect(visibleText(page, "Open Family Day (Test)")).toBeVisible();

    await page.goto("/en/events?category=sports");
    await expect(results(page)).toHaveCount(1);

    await page.goto("/en/events?date=next-30-days");
    await expect(results(page).first()).toBeVisible();
  });

  test("الترتيب حسب السعر", async ({ page }) => {
    await page.goto("/en/events?sort=price-desc&q=(Test)");
    await expect(results(page).first()).toContainText("Startup Summit (Test)");
    await page.goto("/en/events?sort=price-asc&q=(Test)");
    await expect(results(page).first()).toContainText("Open Family Day (Test)");
  });

  test("حالة فارغة صادقة عند عدم وجود نتائج", async ({ page }) => {
    await page.goto("/ar/events?q=zzzz-not-found");
    await expect(visibleText(page, "لا توجد فعاليات مطابقة")).toBeVisible();
    await expect(page.getByTestId("results-count").filter({ visible: true })).toHaveText("لا توجد نتائج");
  });

  test("قيم الرابط غير الصالحة تُتجاهل بأمان", async ({ page }) => {
    const res = await page.goto("/en/events?area=mars&page=-4&sort=evil&day=not-a-date");
    expect(res?.status()).toBe(200);
    await expect(results(page).first()).toBeVisible();
  });
});

test.describe("صفحة الفعالية", () => {
  test("التفاصيل والتذاكر والخريطة والبيانات المنظّمة", async ({ page }) => {
    await page.goto("/en/events/e2e-tech-forum");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kuwait Tech Forum (Test)");
    const tickets = page.getByTestId("ticket-types");
    await expect(tickets).toContainText("General");
    await expect(tickets).toContainText("VIP");
    await expect(tickets).toContainText("KWD 45.500");
    await expect(page.getByTestId("event-map")).toBeAttached();

    const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}");
    expect(ld["@type"]).toBe("Event");
    expect(ld.offers.map((o: { price: string }) => o.price)).toEqual(["15.000", "45.500"]);
    expect(ld.location.geo.latitude).toBeCloseTo(29.3897);

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/en\/events\/e2e-tech-forum$/,
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      "Kuwait Tech Forum (Test)",
    );
  });

  test("لا خريطة بدون إحداثيات حقيقية، والمجانية تُعرض مجانًا", async ({ page }) => {
    await page.goto("/ar/events/e2e-family-day");
    await expect(page.getByTestId("event-map")).toHaveCount(0);
    await expect(page.getByTestId("ticket-types")).toContainText("مجاني");
  });

  test("فعالية نفدت تذاكرها", async ({ page }) => {
    await page.goto("/en/events/e2e-sold-out-workshop");
    await expect(page.getByTestId("event-status")).toHaveText("Sold out");
  });

  test("الفعاليات غير المنشورة والروابط الخاطئة تُرجع 404", async ({ request }) => {
    for (const path of [
      "/ar/events/e2e-pending-play",
      "/en/events/e2e-draft-course",
      "/en/events/does-not-exist",
      "/en/events/BAD_slug!",
      "/en/events/e2e-pending-play/calendar",
    ]) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(404);
    }
  });

  test("ملف التقويم ICS", async ({ request }) => {
    const res = await request.get("/en/events/e2e-tech-forum/calendar");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/calendar");
    const body = await res.text();
    expect(body).toContain("BEGIN:VEVENT");
    expect(body).toContain("SUMMARY:Kuwait Tech Forum (Test)");
  });

  test("الرابط المباشر يعمل والفعاليات المشابهة تظهر", async ({ page }) => {
    await page.goto("/ar/events/e2e-music-night");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("أمسية موسيقية (تجريبية)");
    await expect(
      page.getByRole("region", { name: "فعاليات مشابهة" }).locator("article").first(),
    ).toBeVisible();
  });
});

test.describe("SEO", () => {
  test("sitemap يضم المنشورة فقط و robots", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/en/events/e2e-tech-forum");
    expect(sitemap).toContain("/ar/events/e2e-tech-forum");
    expect(sitemap).not.toContain("e2e-pending-play");
    expect(sitemap).not.toContain("e2e-draft-course");

    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Sitemap:");
    expect(robots).toContain("Disallow: /*/admin");
  });
});

test.describe("إمكانية الوصول — الفعاليات", () => {
  for (const colorScheme of ["light", "dark"] as const) {
    for (const path of ["/en/events", "/ar/events/e2e-tech-forum"]) {
      test(`${path} — ${colorScheme}`, async ({ page }) => {
        await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        const res = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          // خريطة OpenStreetMap داخل iframe خارجي — خارج تحكمنا
          .exclude("[data-testid=event-map]")
          .analyze();
        const serious = res.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
        expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual(
          [],
        );
      });
    }
  }

  test("لا تمرير أفقي في صفحة الفعالية على الجوال", async ({ page }) => {
    await page.goto("/ar/events/e2e-tech-forum");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
