import { notFound } from "next/navigation";

// أي مسار غير معروف داخل لغة (مثل /ar/unknown) يعرض صفحة 404 المترجمة
export default function CatchAll() {
  notFound();
}
