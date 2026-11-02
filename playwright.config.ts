import { defineConfig, devices } from "@playwright/test";

// متغيرات البيئة المحلية (لاختبارات الدخول الفعلي التي تتطلب المفتاح السري)
try {
  process.loadEnvFile(".env.local");
} catch {
  // غير موجود في CI — الاختبارات التي تحتاجه تُتخطى تلقائيًا
}

const PORT = Number(process.env.PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

/**
 * اختبارات E2E تعمل على نسخة إنتاجية محلية (build + start) لتطابق سلوك النشر.
 * لا تُشغَّل أبدًا على بيانات إنتاج حقيقية.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // 4 عمّال: كل متصفح يرسم مشهد 3D برمجيًا؛ أكثر من ذلك يسبب بطئًا وانتهاء مهلات زائفًا
  workers: process.env.CI ? 2 : 4,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npm run start -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    env: process.env.SUPABASE_SECRET_KEY ? {} : { E2E_ALLOW_NO_RATE_LIMIT: "1" },
    timeout: 120_000,
  },
});
