import { Search } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { localeDirection } from "@/i18n/routing";

import { LocaleToggle } from "./locale-toggle";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import { NavMenu } from "./nav-menu";
import { NotificationsBell } from "./notifications-bell";
import { ThemeSwitch } from "./theme-switch";
import { UserMenu } from "./user-menu";

/**
 * الـ Header بنمط المرجع: شريط شفاف ثابت، الشعار في جهة البداية، التنقل،
 * ثم "كبسولات" زجاجية: البحث، الثيم، اللغة، الإشعارات، المستخدم.
 */
export async function SiteHeader() {
  const t = await getTranslations("Nav");
  const locale = await getLocale();

  return (
    <header className="sticky top-0 z-50">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/90 via-background/60 to-transparent [mask-image:linear-gradient(to_bottom,black_70%,transparent)] backdrop-blur-md" />
      <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <MobileNav dir={localeDirection[locale]} />

        <Link href="/" aria-label={t("homeLink")} className="me-2 shrink-0 rounded-lg lg:me-6">
          <Logo />
        </Link>

        <NavMenu />

        <div className="ms-auto flex items-center gap-2">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="glass size-10 rounded-full"
            aria-label={t("search")}
          >
            <Link href="/events">
              <Search className="size-[18px]" aria-hidden />
            </Link>
          </Button>
          <ThemeSwitch className="hidden sm:flex" />
          <LocaleToggle className="hidden sm:flex" />
          <NotificationsBell />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
