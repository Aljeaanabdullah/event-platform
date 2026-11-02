"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/**
 * يبدّل بين العربية والإنجليزية مع الإبقاء على نفس الصفحة ومعاملات البحث.
 * next-intl يحفظ الاختيار في كوكي NEXT_LOCALE تلقائيًا.
 */
export function LocaleSwitcher({
  className,
  showLabel = false,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const t = useTranslations("Locale");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const target: Locale = locale === "ar" ? "en" : "ar";

  function switchLocale() {
    const search = window.location.search;
    startTransition(() => {
      router.replace(`${pathname}${search}`, { locale: target, scroll: false });
    });
  }

  return (
    <Button
      variant="ghost"
      size={showLabel ? "default" : "sm"}
      onClick={switchLocale}
      disabled={isPending}
      aria-label={t("switchTo")}
      data-testid="locale-switcher"
      className={cn("gap-2", className)}
    >
      <Languages className="size-4" aria-hidden />
      <span lang={target}>{t("targetName")}</span>
    </Button>
  );
}
