"use client";

import { Timer } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { useRouter } from "@/i18n/navigation";

/**
 * عدّاد مدة الحجز المؤقت (15 دقيقة من قاعدة البيانات). للعرض فقط:
 * التحرير الفعلي يتم في قاعدة البيانات (release_expired_holds عبر pg_cron كل دقيقة).
 */
export function HoldCountdown({ expiresAt }: { expiresAt: string }) {
  const t = useTranslations("Checkout");
  const router = useRouter();
  const [left, setLeft] = useState(() => new Date(expiresAt).getTime() - Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      setLeft(ms);
      if (ms <= 0) {
        clearInterval(timer);
        // ننتظر قليلًا حتى تُحدّث المهمة المجدولة الحالة ثم نعيد التحميل
        setTimeout(() => router.refresh(), 65_000);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt, router]);

  const total = Math.max(0, Math.floor(left / 1000));
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");

  return (
    <p
      className="flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-900 dark:text-amber-200"
      role="timer"
      aria-live="off"
      data-testid="hold-countdown"
    >
      <Timer className="size-4" aria-hidden />
      {total > 0 ? t("holdLeft", { time: `${mm}:${ss}` }) : t("holdExpired")}
    </p>
  );
}
