"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

/**
 * مبدّل الثيم بشكل "كبسولة" كما في التصميم المرجعي.
 * الحالة النشطة تُرسم عبر CSS (dark:) وليس عبر JavaScript، فلا يحدث اختلاف بين الخادم والمتصفح
 * ولا وميض عند التحميل. خيار "حسب الجهاز" متاح في قائمة الـ Footer.
 */
export function ThemeSwitch({ className }: { className?: string }) {
  const t = useTranslations("Theme");
  const { setTheme } = useTheme();

  const base =
    "grid size-8 place-items-center rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60";

  return (
    <div
      role="group"
      aria-label={t("toggle")}
      className={cn("glass flex items-center gap-0.5 rounded-full p-1", className)}
    >
      <button
        type="button"
        onClick={() => setTheme("dark")}
        aria-label={t("dark")}
        data-testid="theme-dark"
        className={cn(
          base,
          "text-muted-foreground hover:text-foreground",
          "dark:bg-gradient-neon dark:text-white dark:glow-primary",
        )}
      >
        <Moon className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => setTheme("light")}
        aria-label={t("light")}
        data-testid="theme-light"
        className={cn(
          base,
          "bg-gradient-neon text-white glow-primary",
          "dark:bg-none dark:text-muted-foreground dark:shadow-none dark:hover:text-foreground",
        )}
      >
        <Sun className="size-4" aria-hidden />
      </button>
    </div>
  );
}
