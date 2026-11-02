import { Plus, Search } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { localeDirection } from "@/i18n/routing";

import { LocaleSwitcher } from "./locale-switcher";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import { mainNav, routes } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

export async function SiteHeader() {
  const t = await getTranslations("Nav");
  const locale = await getLocale();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/75 backdrop-blur-xl supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:px-6 lg:px-8">
        <MobileNav dir={localeDirection[locale]} />

        <Link href="/" aria-label={t("homeLink")} className="me-4 rounded-lg">
          <Logo />
        </Link>

        <nav aria-label={t("mainNavigation")} className="hidden items-center gap-1 md:flex">
          {mainNav.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" aria-label={t("search")}>
            <Link href="/events">
              <Search className="size-5" aria-hidden />
            </Link>
          </Button>
          <LocaleSwitcher className="hidden sm:inline-flex" />
          <ThemeToggle />
          <Button asChild variant="ghost" className="hidden md:inline-flex">
            <Link href={routes.login}>{t("login")}</Link>
          </Button>
          <Button asChild className="hidden md:inline-flex">
            <Link href={routes.addEvent}>
              <Plus aria-hidden />
              {t("addEvent")}
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
