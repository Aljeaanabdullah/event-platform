/**
 * شعار الجهة المنظِّمة في حاوية event-media.
 * المسار إلزاميًا: {organizer_id}/logo/{uuid}.{ext} — سياسة الحاوية تسمح بالكتابة فقط لـ owner/manager
 * داخل مجلد جهتهم، وهنا نتحقق أن المسار المحفوظ يخص الجهة نفسها (لا يمكن ربط ملف جهة أخرى).
 */
export const logoPathRegex = /^([0-9a-f-]{36})\/logo\/[0-9a-f-]{36}\.(jpg|jpeg|png|webp|avif)$/;

export function isOwnLogoPath(organizerId: string, path: string): boolean {
  const match = logoPathRegex.exec(path);
  return match !== null && match[1] === organizerId;
}

export function newLogoPath(organizerId: string, ext: string, id: string = crypto.randomUUID()): string {
  return `${organizerId}/logo/${id}.${ext}`;
}
