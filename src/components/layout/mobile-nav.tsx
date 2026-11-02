"use client";

import { Menu, Plus, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Link } from "@/i18n/navigation";
import { useSession } from "@/components/providers/session-provider";

import { LocaleSwitcher } from "./locale-switcher";
import { Logo } from "./logo";
import { mainNav, routes } from "./nav-links";

export function MobileNav({ dir }: { dir: "rtl" | "ltr" }) {
  const t = useTranslations("Nav");
  const [open, setOpen] = useState(false);
  const session = useSession();
  const tMenu = useTranslations("UserMenu");
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label={t("openMenu")}>
          <Menu className="size-5" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side={dir === "rtl" ? "right" : "left"} className="w-[85vw] max-w-sm">
        <SheetHeader>
          <SheetTitle className="sr-only">{t("menu")}</SheetTitle>
          <Logo />
        </SheetHeader>
        <nav aria-label={t("mainNavigation")} className="flex flex-col gap-1 px-4">
          <Link
            href="/events"
            onClick={close}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 font-medium hover:bg-muted"
          >
            <Search className="size-4 text-muted-foreground" aria-hidden />
            {t("search")}
          </Link>
          {mainNav.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              onClick={close}
              className="rounded-lg px-3 py-2.5 font-medium hover:bg-muted"
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>
        <Separator className="my-2" />
        <div className="flex flex-col gap-2 px-4">
          <Button asChild>
            <Link href={routes.addEvent} onClick={close}>
              <Plus aria-hidden />
              {t("addEvent")}
            </Link>
          </Button>
          {session.status === "authenticated" ? (
            <Button asChild variant="outline">
              <Link href={routes.account} onClick={close}>
                {tMenu("account")}
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href={routes.login} onClick={close}>
                {t("login")}
              </Link>
            </Button>
          )}
          <LocaleSwitcher showLabel className="justify-start" />
        </div>
      </SheetContent>
    </Sheet>
  );
}
