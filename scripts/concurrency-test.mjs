/**
 * اختبار تزامن حقيقي للحجز عبر Supabase API (نفس مسار الموقع).
 *
 * ينشئ مستخدمين وفعالية بسعة محدودة، ثم يرسل كل الطلبات في نفس اللحظة (Promise.all)
 * ويتحقق أن عدد الحجوزات الناجحة = السعة بالضبط، وأن المخزون لم يتجاوز الحد.
 * يحذف كل بيانات الاختبار في النهاية حتى لو فشل الاختبار.
 *
 * يتطلب في .env.local: NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY و SUPABASE_SECRET_KEY
 * ⚠️ لبيئة التطوير فقط — لا تشغّله على قاعدة الإنتاج.
 *
 * التشغيل: npm run test:db:concurrency
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLISHABLE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SECRET = process.env.SUPABASE_SECRET_KEY;
const CAPACITY = 5;
const BUYERS = 30;

if (!URL || !PUBLISHABLE || !SECRET) {
  console.error("❌ المتغيرات ناقصة في .env.local (SUPABASE_SECRET_KEY مطلوب لهذا الاختبار)");
  process.exit(1);
}

const admin = createClient(URL, SECRET, { auth: { persistSession: false, autoRefreshToken: false } });
const runId = randomUUID().slice(0, 8);
const password = `T-${randomUUID()}`;
const userIds = [];
let organizerId;
let eventId;

async function must(promise, label) {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

async function cleanup() {
  if (eventId) {
    await admin.from("orders").delete().eq("event_id", eventId);
    await admin.from("ticket_types").delete().eq("event_id", eventId);
    await admin.from("events").delete().eq("id", eventId);
  }
  if (organizerId) await admin.from("organizers").delete().eq("id", organizerId);
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
}

try {
  console.log(`▶ إنشاء ${BUYERS} مستخدم اختبار…`);
  const users = await Promise.all(
    Array.from({ length: BUYERS }, (_, i) =>
      must(
        admin.auth.admin.createUser({
          email: `cc-${runId}-${i}@concurrency.test`,
          password,
          email_confirm: true,
        }),
        "createUser",
      ),
    ),
  );
  users.forEach((u) => userIds.push(u.user.id));

  const category = await must(
    admin.from("event_categories").select("id").eq("slug", "music").single(),
    "category",
  );
  const org = await must(
    admin
      .from("organizers")
      .insert({
        slug: `cc-${runId}`,
        name_ar: "اختبار التزامن",
        name_en: "Concurrency test",
        contact_email: `cc-${runId}@concurrency.test`,
        status: "approved",
        created_by: userIds[0],
      })
      .select("id")
      .single(),
    "organizer",
  );
  organizerId = org.id;

  const start = new Date(Date.now() + 5 * 86_400_000);
  const event = await must(
    admin
      .from("events")
      .insert({
        organizer_id: organizerId,
        category_id: category.id,
        slug: `cc-${runId}`,
        title_ar: "اختبار التزامن",
        title_en: "Concurrency test",
        governorate: "capital",
        starts_at: start.toISOString(),
        ends_at: new Date(start.getTime() + 7_200_000).toISOString(),
        status: "published",
        published_at: new Date().toISOString(),
        created_by: userIds[0],
      })
      .select("id")
      .single(),
    "event",
  );
  eventId = event.id;

  const ticket = await must(
    admin
      .from("ticket_types")
      .insert({
        event_id: eventId,
        name_ar: "عام",
        name_en: "General",
        price_fils: 1000,
        quantity_total: CAPACITY,
      })
      .select("id")
      .single(),
    "ticket type",
  );

  console.log("▶ تسجيل دخول المستخدمين…");
  const clients = await Promise.all(
    users.map(async (u) => {
      const c = createClient(URL, PUBLISHABLE, { auth: { persistSession: false, autoRefreshToken: false } });
      await must(c.auth.signInWithPassword({ email: u.user.email, password }), "signIn");
      return c;
    }),
  );

  console.log(`▶ إرسال ${BUYERS} طلب حجز في نفس اللحظة على ${CAPACITY} تذاكر…`);
  const t0 = performance.now();
  const results = await Promise.all(
    clients.map((c) =>
      c.rpc("reserve_tickets", {
        p_event_id: eventId,
        p_items: [{ ticket_type_id: ticket.id, quantity: 1 }],
      }),
    ),
  );
  const elapsed = Math.round(performance.now() - t0);

  const ok = results.filter((r) => !r.error).length;
  const soldOut = results.filter((r) => r.error?.message === "SOLD_OUT").length;
  const other = results.filter((r) => r.error && r.error.message !== "SOLD_OUT").map((r) => r.error.message);
  const final = await must(
    admin
      .from("ticket_types")
      .select("quantity_total, quantity_sold, quantity_reserved")
      .eq("id", ticket.id)
      .single(),
    "final",
  );

  console.log(`  نجح: ${ok} | نفدت: ${soldOut} | أخطاء أخرى: ${other.length} | الزمن: ${elapsed}ms`);
  console.log(
    `  المخزون النهائي: إجمالي=${final.quantity_total} محجوز=${final.quantity_reserved} مباع=${final.quantity_sold}`,
  );

  const pass =
    ok === CAPACITY &&
    soldOut === BUYERS - CAPACITY &&
    other.length === 0 &&
    final.quantity_reserved + final.quantity_sold === CAPACITY;

  if (!pass) {
    console.error("❌ فشل اختبار التزامن", other);
    process.exitCode = 1;
  } else {
    console.log("✅ لا يوجد حجز زائد تحت التزامن الحقيقي");
  }
} catch (err) {
  console.error("❌", err.message);
  process.exitCode = 1;
} finally {
  console.log("▶ حذف بيانات الاختبار…");
  await cleanup();
}
