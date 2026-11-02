import type { Metadata, Viewport } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { AppProviders } from "@/components/providers/app-providers";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SkipLink } from "@/components/layout/skip-link";
import { siteUrl } from "@/config/site";
import { localeDirection, routing } from "@/i18n/routing";
import { inter, plexArabic } from "@/lib/fonts";
import { cn } from "@/lib/utils";

import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f4fd" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0920" },
  ],
};

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "Metadata" });

  return {
    metadataBase: new URL(siteUrl),
    title: { default: t("title"), template: `%s | ${t("shortTitle")}` },
    description: t("description"),
    applicationName: t("shortTitle"),
    alternates: {
      canonical: `/${locale}`,
      languages: { ar: "/ar", en: "/en", "x-default": "/ar" },
    },
    openGraph: {
      type: "website",
      siteName: t("shortTitle"),
      locale: locale === "ar" ? "ar_KW" : "en_US",
      title: t("title"),
      description: t("description"),
    },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const dir = localeDirection[locale];

  return (
    // suppressHydrationWarning: next-themes يضيف class الثيم على <html> قبل التحميل
    <html
      lang={locale}
      dir={dir}
      className={cn(inter.variable, plexArabic.variable)}
      suppressHydrationWarning
    >
      <body className="flex min-h-dvh flex-col antialiased">
        {/* بدون JavaScript: نُظهر المحتوى الذي ينتظر حركة الظهور أثناء التمرير */}
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important;filter:none!important}`}</style>
        </noscript>
        <NextIntlClientProvider>
          <AppProviders dir={dir}>
            {/* توهجات الخلفية الثابتة خلف كل الصفحات */}
            <div aria-hidden className="page-backdrop pointer-events-none fixed inset-0 -z-50" />
            <SkipLink />
            <SiteHeader />
            <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
              {children}
            </main>
            <SiteFooter />
          </AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
