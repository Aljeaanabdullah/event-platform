"use client";

import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import { mainNav } from "./nav-links";

/** روابط التنقل مع حالة "نشط" (تدرج نيون + خط سفلي متوهج) كما في المرجع */
export function NavMenu() {
  const t = useTranslations("Nav");
  const pathname = usePathname();

  return (
    <nav aria-label={t("mainNavigation")} className="hidden items-center gap-1 lg:flex">
      {mainNav.map((item) => {
        const base = item.href.split("#")[0] || "/";
        const active = item.href.includes("#")
          ? false
          : base === "/"
            ? pathname === "/"
            : pathname.startsWith(base);
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors",
              active ? "text-gradient-neon" : "text-foreground/80 hover:text-foreground",
            )}
          >
            {t(item.key)}
            <span
              aria-hidden
              className={cn(
                "absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-gradient-neon transition-all duration-300",
                active
                  ? "opacity-100 shadow-[0_0_12px_var(--glow-strong)]"
                  : "scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-60",
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
