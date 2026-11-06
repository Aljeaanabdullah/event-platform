/**
 * استدعاءات MyFatoorah المشتركة بين Edge Functions.
 * المفتاح من Supabase Secrets فقط، والرابط الافتراضي هو البيئة التجريبية.
 */
const baseUrl = () =>
  (Deno.env.get("MYFATOORAH_BASE_URL") ?? "https://apitest.myfatoorah.com").replace(/\/+$/, "");

export async function myFatoorah<T>(path: string, body: unknown): Promise<T> {
  const apiKey = Deno.env.get("MYFATOORAH_API_KEY");
  if (!apiKey) throw new Error("MYFATOORAH_API_KEY is not set");
  const res = await fetch(`${baseUrl()}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.IsSuccess === false) {
    throw new Error(`MyFatoorah ${path} failed: ${res.status} ${json.Message ?? ""}`.trim());
  }
  return json as T;
}

/** المواقع المسموح بالعودة إليها بعد الدفع (يمنع Open Redirect) */
const ALLOWED_ORIGINS = [
  /^http:\/\/localhost:3000$/,
  /^https:\/\/event-platform-one-fawn\.vercel\.app$/,
  /^https:\/\/event-platform-[a-z0-9-]+-codedclub\.vercel\.app$/,
];

export const isAllowedOrigin = (origin: string | null): origin is string =>
  !!origin && ALLOWED_ORIGINS.some((pattern) => pattern.test(origin));
