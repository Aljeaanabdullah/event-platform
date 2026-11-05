/**
 * روابط ملفات Supabase Storage العامة (حاوية event-media للقراءة العامة).
 * المسارات تأتي من قاعدة البيانات فقط؛ نرفض أي مسار فيه ".." أو يبدأ بـ "/".
 */
export const EVENT_MEDIA_BUCKET = "event-media";

export function publicMediaUrl(path: string | null | undefined): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!path || !base || path.startsWith("/") || path.includes("..")) return null;
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${base}/storage/v1/object/public/${EVENT_MEDIA_BUCKET}/${encoded}`;
}
