/**
 * متغيرات البيئة العامة (آمنة للعرض في المتصفح).
 *
 * ملاحظة: Next.js يستبدل `process.env.NEXT_PUBLIC_*` وقت البناء فقط عند كتابتها حرفيًا،
 * لذلك نذكر كل متغير صراحةً بدل المرور على `process.env` ديناميكيًا.
 *
 * التحقق كسول (عند أول استخدام) حتى لا يفشل البناء قبل ضبط Supabase.
 * المتغيرات السرية موجودة في `env.server.ts` ولا تُستورد أبدًا في كود العميل.
 */
import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

let cached: PublicEnv | undefined;

export function publicEnv(): PublicEnv {
  if (cached) return cached;

  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });

  if (!parsed.success) {
    throw new Error(
      `متغيرات البيئة العامة غير صالحة أو ناقصة (راجع .env.example):\n${z.prettifyError(parsed.error)}`,
    );
  }

  cached = parsed.data;
  return cached;
}
