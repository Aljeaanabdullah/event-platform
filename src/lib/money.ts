/**
 * أدوات المبالغ المالية.
 *
 * القاعدة: كل المبالغ تُخزَّن وتُحسب كأعداد صحيحة بالفلس (1 د.ك = 1000 فلس).
 * لا نستخدم الأعداد العشرية في الحسابات إطلاقًا لتفادي أخطاء التقريب.
 */

export const FILS_PER_KWD = 1000;
export const DEFAULT_CURRENCY = "KWD";

/** basis points: 10000 = 100% */
export const BPS_DENOMINATOR = 10_000;

function assertFils(value: number, label = "amount"): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${label} يجب أن يكون عددًا صحيحًا بالفلس، القيمة: ${value}`);
  }
}

/**
 * تحويل نص بالدينار (مثل "12.5" أو "0.250") إلى فلس دون المرور بعمليات float.
 * يرفض أكثر من 3 خانات عشرية والقيم السالبة.
 */
export function parseKwdToFils(input: string): number {
  const trimmed = input.trim();
  const match = /^(\d+)(?:\.(\d{1,3}))?$/.exec(trimmed);
  if (!match) {
    throw new RangeError(`مبلغ غير صالح: "${input}"`);
  }
  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? "").padEnd(3, "0"));
  const fils = whole * FILS_PER_KWD + fraction;
  assertFils(fils);
  return fils;
}

/** تحويل الفلس إلى نص بالدينار بثلاث خانات (للنماذج وواجهات الدفع). */
export function filsToKwdString(fils: number): string {
  assertFils(fils);
  const sign = fils < 0 ? "-" : "";
  const abs = Math.abs(fils);
  const whole = Math.floor(abs / FILS_PER_KWD);
  const fraction = String(abs % FILS_PER_KWD).padStart(3, "0");
  return `${sign}${whole}.${fraction}`;
}

/**
 * تنسيق المبلغ للعرض حسب اللغة.
 * نستخدم الأرقام اللاتينية في العربية أيضًا (‎-u-nu-latn) لتتطابق مع التواريخ وأسلوب المواقع الخليجية.
 */
export function formatMoney(fils: number, locale: string, currency = DEFAULT_CURRENCY): string {
  assertFils(fils);
  return new Intl.NumberFormat(locale === "ar" ? "ar-KW-u-nu-latn" : "en-KW", {
    style: "currency",
    currency,
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(fils / FILS_PER_KWD);
}

/**
 * حساب نسبة (عمولة/رسوم) من مبلغ بالفلس، مع التقريب لأقرب فلس (النصف للأعلى).
 * يعمل بالأعداد الصحيحة فقط.
 */
export function applyBps(fils: number, bps: number): number {
  assertFils(fils);
  assertFils(bps, "bps");
  if (fils < 0 || bps < 0) throw new RangeError("القيم السالبة غير مسموحة");
  return Math.floor((fils * bps + BPS_DENOMINATOR / 2) / BPS_DENOMINATOR);
}
