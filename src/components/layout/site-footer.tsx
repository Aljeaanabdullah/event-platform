import { getTranslations } from "next-intl/server";

import { Separator } from "@/components/ui/separator";
import { Link } from "@/i18n/navigation";

import { LocaleSwitcher } from "./locale-switcher";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

export async function SiteFooter() {
  const t = await getTranslations("Footer");

  // روابط الصفحات القانونية (الشروط، الخصوصية، الاسترجاع) تُضاف عند اعتماد محتواها في Phase 10
  const columns = [
    {
      title: t("discover"),
      links: [
        { href: "/events", label: t("allEvents") },
        { href: "/events?date=weekend", label: t("thisWeekend") },
        { href: "/events?price=free", label: t("freeEvents") },
      ],
    },
    {
      title: t("organizers"),
      links: [{ href: "/#organizers", label: t("becomeOrganizer") }],
    },
  ];

  return (
    <footer className="mt-24 border-t bg-card/50">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4 lg:px-8">
        <div className="space-y-4 md:col-span-2">
          <Logo />
          <p className="max-w-sm text-sm text-muted-foreground">{t("tagline")}</p>
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="mb-3 text-sm font-semibold">{col.title}</h2>
            <ul className="space-y-2">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <Separator />
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
        <p>{t("rights", { year: new Date().getFullYear() })}</p>
        <div className="flex items-center gap-2">
          <span className="sr-only">{t("preferences")}</span>
          <span>{t("madeIn")}</span>
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
}
