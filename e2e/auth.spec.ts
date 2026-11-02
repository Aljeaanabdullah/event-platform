import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * اختبارات المصادقة.
 * - اختبارات الواجهة والتحقق والحماية تعمل دائمًا.
 * - اختبارات الدخول الفعلي (إنشاء مستخدم مؤكَّد، الدخول، تعديل الملف، الخروج) تتطلب
 *   SUPABASE_SECRET_KEY لإنشاء مستخدم اختبار وحذفه — وتُتخطى بدونه.
 */

test.describe("حماية المسارات", () => {
  for (const [path, locale] of [
    ["/ar/account", "ar"],
    ["/en/organizer", "en"],
    ["/ar/organizer/apply", "ar"],
    ["/en/admin", "en"],
  ] as const) {
    test(`${path} يحوّل غير المسجل لصفحة الدخول مع العودة`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`/${locale}/login\\?next=${encodeURIComponent(path)}$`));
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });
  }

  test("صفحة إعادة التعيين بدون جلسة تعرض انتهاء الرابط", async ({ page }) => {
    await page.goto("/ar/reset-password");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("انتهت صلاحية الرابط");
  });

  test("رابط callback بدون رمز يعود للدخول برسالة خطأ", async ({ page }) => {
    await page.goto("/auth/callback?next=/en/account");
    await expect(page).toHaveURL(/\/en\/login\?error=callback$/);
    await expect(page.getByRole("form").getByRole("alert")).toContainText("complete sign-in");
  });

  test("callback لا يقبل التحويل لموقع خارجي", async ({ request }) => {
    const res = await request.get("/auth/callback?next=//evil.com", { maxRedirects: 0 });
    expect(res.status()).toBe(307);
    expect(res.headers()["location"]).not.toContain("evil.com");
  });
});

test.describe("صفحات المصادقة", () => {
  test("الدخول بالعربية: زر Google والتحقق من الحقول", async ({ page }) => {
    await page.goto("/ar/login");
    await expect(page.getByRole("button", { name: "المتابعة باستخدام Google" })).toBeVisible();
    await page.getByRole("button", { name: "تسجيل الدخول", exact: true }).click();
    await expect(page.getByText("أدخل بريدًا إلكترونيًا صحيحًا")).toBeVisible();
    await expect(page.getByText("هذا الحقل مطلوب")).toBeVisible();
    // الحقل يُربط برسالة الخطأ لقارئ الشاشة
    await expect(page.getByLabel("البريد الإلكتروني")).toHaveAttribute("aria-invalid", "true");
  });

  test("بيانات دخول خاطئة تُظهر رسالة عامة دون كشف وجود الحساب", async ({ page }) => {
    await page.goto("/en/login");
    await page.getByLabel("Email").fill(`nobody-${Date.now()}@example.com`);
    await page.getByLabel("Password", { exact: true }).fill("WrongPass123");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    // طلب حقيقي لخادم Supabase — مهلة أطول لأول طلب بعد البناء
    await expect(page.getByRole("form").getByRole("alert")).toHaveText("Incorrect email or password", {
      timeout: 15_000,
    });
  });

  test("إظهار/إخفاء كلمة المرور", async ({ page }) => {
    await page.goto("/en/login");
    const input = page.getByLabel("Password", { exact: true });
    await expect(input).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Show password" }).click();
    await expect(input).toHaveAttribute("type", "text");
  });

  test("التسجيل: تحقق قوة كلمة المرور والتطابق", async ({ page }) => {
    await page.goto("/en/register");
    await page.getByLabel("Full name").fill("Test User");
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Password", { exact: true }).fill("onlyletters");
    await page.getByLabel("Confirm password").fill("different1");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Password must include at least one number")).toBeVisible();
    await expect(page.getByText("Passwords don't match")).toBeVisible();
  });

  test("التسجيل: اختيار نوع الحساب ومسبق الاختيار للمنظّم", async ({ page }) => {
    await page.goto("/ar/register?type=organizer");
    await expect(page.getByRole("radio", { name: /منظّم فعاليات/ })).toBeChecked();
    await page.getByText("حاضر", { exact: true }).click();
    await expect(page.getByRole("radio", { name: /حاضر/ })).toBeChecked();
  });

  test("استعادة كلمة المرور: التحقق من البريد", async ({ page }) => {
    await page.goto("/ar/forgot-password");
    await page.getByRole("button", { name: "إرسال رابط الاستعادة" }).click();
    await expect(page.getByText("أدخل بريدًا إلكترونيًا صحيحًا")).toBeVisible();
  });

  test("الـ Header يعرض زر الدخول للزائر", async ({ page, isMobile }) => {
    test.skip(isMobile, "زر الدخول داخل قائمة الجوال");
    await page.goto("/en");
    await expect(page.getByTestId("header-login")).toBeVisible();
  });
});

test.describe("إمكانية الوصول لصفحات المصادقة (axe)", () => {
  for (const colorScheme of ["light", "dark"] as const) {
    for (const path of ["/ar/login", "/en/register", "/ar/forgot-password"]) {
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

// ---------------------------------------------------------------------
// الدخول الفعلي — يتطلب SUPABASE_SECRET_KEY (مستخدم اختبار يُنشأ ويُحذف تلقائيًا)
// ---------------------------------------------------------------------
test.describe("دورة حياة الحساب الحقيقية", () => {
  test.skip(!process.env.SUPABASE_SECRET_KEY, "يتطلب SUPABASE_SECRET_KEY في .env.local");
  test.describe.configure({ mode: "serial" });

  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@e2e.test`;
  const password = "E2ePass123";
  let userId: string | undefined;

  const adminFetch = (path: string, init: RequestInit = {}) =>
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/${path}`, {
      ...init,
      headers: {
        apikey: process.env.SUPABASE_SECRET_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });

  test.beforeAll(async () => {
    const res = await adminFetch("users", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: "E2E User" },
      }),
    });
    expect(res.ok).toBe(true);
    userId = (await res.json()).id;
  });

  test.afterAll(async () => {
    if (!userId) return;
    // حذف طلب المنظّم الذي أنشأه الاختبار (العضويات تُحذف تلقائيًا) ثم حذف المستخدم
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/organizers?created_by=eq.${userId}`, {
      method: "DELETE",
      headers: {
        apikey: process.env.SUPABASE_SECRET_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
      },
    });
    const res = await adminFetch(`users/${userId}`, { method: "DELETE" });
    expect(res.ok).toBe(true);
  });

  test("الدخول، تعديل الملف الشخصي، منع لوحة المدير، ثم الخروج", async ({ page, isMobile }) => {
    test.skip(isMobile, "يكفي تشغيله مرة واحدة");
    await page.goto("/en/login?next=%2Fen%2Faccount");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    await expect(page).toHaveURL(/\/en\/account$/);
    await expect(page.getByTestId("account-roles")).toContainText("Attendee");
    await expect(page.getByLabel("Full name")).toHaveValue("E2E User");

    await page.getByLabel("Full name").fill("E2E Renamed");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Changes saved")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Full name")).toHaveValue("E2E Renamed");

    // صفحات الضيوف تحوّل المسجّل لحسابه
    await page.goto("/en/login");
    await expect(page).toHaveURL(/\/en\/account$/);

    // غير المدير يحصل على 404 للوحة الإدارة
    const admin = await page.goto("/en/admin");
    expect(admin?.status()).toBe(404);

    // قائمة المستخدم في الـ Header ثم الخروج
    await page.goto("/en");
    await page.getByTestId("user-menu").click();
    await page.getByTestId("sign-out").click();
    await expect(page.getByTestId("header-login")).toBeVisible();
    await page.goto("/en/account");
    await expect(page).toHaveURL(/\/en\/login/);
  });

  test("طلب الانضمام كمنظّم يُنشئ طلبًا قيد المراجعة", async ({ page, isMobile }) => {
    test.skip(isMobile, "يكفي تشغيله مرة واحدة");
    await page.goto("/ar/login?next=%2Far%2Forganizer%2Fapply");
    await page.getByLabel("البريد الإلكتروني").fill(email);
    await page.getByLabel("كلمة المرور", { exact: true }).fill(password);
    await page.getByRole("button", { name: "تسجيل الدخول", exact: true }).click();
    await expect(page).toHaveURL(/\/ar\/organizer\/apply$/);

    const slug = `e2e-${Date.now()}`;
    await page.getByLabel("اسم الجهة بالعربية").fill("جهة اختبار");
    await page.getByLabel("اسم الجهة بالإنجليزية").fill("E2E Org");
    await page.getByLabel("المعرّف في الرابط").fill(slug);
    await page.getByRole("button", { name: "إرسال الطلب" }).click();

    await expect(page).toHaveURL(/\/ar\/organizer$/);
    await expect(page.getByTestId("organizer-memberships")).toContainText("قيد المراجعة");
  });
});
