/**
 * متغيرات البيئة السرية — للخادم فقط.
 * استيراد `server-only` يجعل البناء يفشل إذا استُورد هذا الملف في مكوّن عميل،
 * فلا يمكن أن يتسرب أي مفتاح سري إلى المتصفح.
 */
import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  /** مفتاح Supabase السري (يتجاوز RLS) — للـ Webhooks والمهام الإدارية فقط */
  SUPABASE_SECRET_KEY: z.string().min(1),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverEnvSchema.safeParse({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  });

  if (!parsed.success) {
    throw new Error(
      `متغيرات البيئة السرية غير صالحة أو ناقصة (راجع .env.example):\n${z.prettifyError(parsed.error)}`,
    );
  }

  cached = parsed.data;
  return cached;
}
