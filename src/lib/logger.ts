/**
 * تسجيل أخطاء بسيط ومنظّم (JSON) يُقرأ في سجلات Vercel.
 * يمكن ربطه لاحقًا بخدمة مراقبة مثل Sentry دون تغيير أماكن الاستدعاء.
 * لا تمرّر أبدًا كلمات مرور أو مفاتيح أو بيانات بطاقات في `context`.
 */
type Level = "debug" | "info" | "warn" | "error";
type Context = Record<string, unknown>;

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { message: String(error) };
}

function write(level: Level, message: string, context?: Context) {
  if (level === "debug" && process.env.NODE_ENV === "production") return;
  const entry = JSON.stringify({ level, message, time: new Date().toISOString(), ...context });
  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.log(entry);
}

export const logger = {
  debug: (message: string, context?: Context) => write("debug", message, context),
  info: (message: string, context?: Context) => write("info", message, context),
  warn: (message: string, context?: Context) => write("warn", message, context),
  error: (message: string, error?: unknown, context?: Context) =>
    write("error", message, { ...context, ...(error === undefined ? {} : { error: serializeError(error) }) }),
};
