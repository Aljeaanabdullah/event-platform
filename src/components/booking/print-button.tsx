"use client";

import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

/**
 * "تنزيل PDF" عبر طباعة المتصفح (حفظ كـ PDF): التذكرة تُطبع بتنسيق خاص (print:)
 * بدون إرسال بياناتها أو رمزها السري إلى أي خدمة خارجية لتوليد PDF.
 */
export function PrintButton() {
  const t = useTranslations("Tickets");
  return (
    <Button
      type="button"
      variant="outline"
      className="glass rounded-xl print:hidden"
      onClick={() => window.print()}
    >
      <Printer aria-hidden />
      {t("print")}
    </Button>
  );
}
