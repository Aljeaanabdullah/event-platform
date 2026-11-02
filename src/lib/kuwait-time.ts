/**
 * حساب الفترات الزمنية بتوقيت الكويت (UTC+3 طوال السنة — لا يوجد توقيت صيفي).
 * نحسب يدويًا بدل الاعتماد على المنطقة الزمنية للخادم.
 *
 * الأسبوع في الكويت يبدأ الأحد. "نهاية الأسبوع" للفعاليات: الخميس–السبت.
 */
import type { DatePreset } from "@/config/site";

export const KUWAIT_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type DateRange = { from: Date; to: Date };

/** بداية اليوم (منتصف الليل بتوقيت الكويت) للحظة معينة */
export function kuwaitStartOfDay(at: Date): Date {
  const local = at.getTime() + KUWAIT_OFFSET_MS;
  return new Date(local - (local % DAY_MS) - KUWAIT_OFFSET_MS);
}

/** يوم الأسبوع بتوقيت الكويت: 0 = الأحد … 6 = السبت */
export function kuwaitWeekday(at: Date): number {
  return new Date(at.getTime() + KUWAIT_OFFSET_MS).getUTCDay();
}

/** تاريخ "YYYY-MM-DD" بتوقيت الكويت */
export function kuwaitDateString(at: Date): string {
  return new Date(at.getTime() + KUWAIT_OFFSET_MS).toISOString().slice(0, 10);
}

/** يحوّل "YYYY-MM-DD" (يوم في الكويت) إلى فترة [بداية اليوم، بداية اليوم التالي) */
export function kuwaitDayRange(day: string): DateRange | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return null;
  const utc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(utc) || kuwaitDateString(new Date(utc - KUWAIT_OFFSET_MS + 1)) !== day) return null;
  const from = new Date(utc - KUWAIT_OFFSET_MS);
  return { from, to: new Date(from.getTime() + DAY_MS) };
}

/** الفترة المقابلة لاختيار جاهز. الفعاليات تُطابق إذا تقاطعت مع الفترة. */
export function presetRange(preset: Exclude<DatePreset, "any">, now = new Date()): DateRange {
  const today = kuwaitStartOfDay(now);
  const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY_MS);

  switch (preset) {
    case "today":
      return { from: now, to: addDays(today, 1) };
    case "tomorrow":
      return { from: addDays(today, 1), to: addDays(today, 2) };
    case "this-week": {
      // حتى نهاية السبت (بداية الأحد القادم)
      const daysToSunday = 7 - kuwaitWeekday(now);
      return { from: now, to: addDays(today, daysToSunday) };
    }
    case "weekend": {
      const weekday = kuwaitWeekday(now);
      // الخميس=4، الجمعة=5، السبت=6
      const inWeekend = weekday >= 4;
      const thursday = inWeekend ? now : addDays(today, 4 - weekday);
      const sunday = addDays(today, 7 - weekday);
      return { from: thursday, to: sunday };
    }
    case "next-30-days":
      return { from: now, to: addDays(today, 31) };
  }
}
