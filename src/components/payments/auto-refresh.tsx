"use client";

import { useEffect } from "react";

import { useRouter } from "@/i18n/navigation";

/** تحديث الصفحة دوريًا أثناء انتظار تأكيد المزوّد (حد أقصى 2 دقيقة) */
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    let runs = 0;
    const timer = setInterval(() => {
      runs += 1;
      router.refresh();
      if (runs * seconds >= 120) clearInterval(timer);
    }, seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds]);
  return null;
}
