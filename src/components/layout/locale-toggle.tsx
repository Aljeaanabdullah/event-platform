"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const labels: Record<Locale, string> = { ar: "AR", en: "EN" };
const names: Record<Locale, string> = { ar: "العربية", en: "English" };

/**
 * مبدّل اللغة بشكل "كبسولة" AR / EN كما في المرجع.
 * يحافظ على نفس الصفحة ومعاملات البحث، وnext-intl يحفظ الاختيار في كوكي NEXT_LOCALE.
 */
export function LocaleToggle({ className }: { className?: string }) {
  const t = useTranslations("Locale");
  const current = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchTo(target: Locale) {
    if (target === current) return;
    const search = window.location.search;
    startTransition(() => router.replace(`${pathname}${search}`, { locale: target, scroll: false }));
  }

  // الترتيب البصري ثابت (EN ثم AR) في الاتجاهين كما في المرجع
  const order: Locale[] = ["en", "ar"];

  return (
    <div
      role="group"
      aria-label={t("label")}
      dir="ltr"
      className={cn(
        "glass flex items-center gap-0.5 rounded-full p-1 text-xs font-bold",
        isPending && "opacity-70",
        className,
      )}
    >
      {order
        .filter((l) => (routing.locales as readonly string[]).includes(l))
        .map((l) => {
          const active = l === current;
          return (
            <button
              key={l}
              type="button"
              lang={l}
              onClick={() => switchTo(l)}
              aria-current={active ? "true" : undefined}
              aria-label={active ? names[l] : t("switchTo")}
              data-testid={active ? "locale-current" : "locale-switcher"}
              disabled={isPending}
              className={cn(
                "h-8 min-w-9 rounded-full px-2.5 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none",
                active
                  ? "bg-gradient-neon text-white glow-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {labels[l]}
            </button>
          );
        })}
    </div>
  );
}
