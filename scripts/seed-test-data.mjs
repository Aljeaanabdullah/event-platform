/**
 * يطبع SQL بيانات الاختبار بعد استبدال كلمة المرور من .env.local.
 * الاستخدام: node --env-file=.env.local scripts/seed-test-data.mjs [--remove] > /tmp/seed.sql
 * ثم نفّذ الناتج عبر SQL Editor (قاعدة بيانات التطوير فقط).
 */
import { readFileSync } from "node:fs";

const dir = new URL("../supabase/seed/", import.meta.url);
const remove = readFileSync(new URL("remove-test-data.sql", dir), "utf8");

if (process.argv.includes("--remove")) {
  process.stdout.write(remove);
} else {
  const password = process.env.E2E_TEST_PASSWORD;
  if (!password || password.length < 12 || /'/.test(password)) {
    console.error("E2E_TEST_PASSWORD غير مضبوط في .env.local (12 حرفًا على الأقل، بدون ').");
    process.exit(1);
  }
  const seed = readFileSync(new URL("test-data.sql", dir), "utf8")
    .replace("\\ir remove-test-data.sql", remove)
    .replaceAll("__E2E_PASSWORD__", password);
  process.stdout.write(seed);
}
