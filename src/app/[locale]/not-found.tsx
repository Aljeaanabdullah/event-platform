import { Compass, Home } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("NotFound");
  const tCommon = useTranslations("Common");

  return (
    <section className="relative isolate mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
      <div aria-hidden className="hero-glow absolute inset-0 -z-10 opacity-70" />
      <p className="text-gradient-brand text-8xl font-black tracking-tighter sm:text-9xl" dir="ltr">
        {t("code")}
      </p>
      <h1 className="mt-4 text-2xl font-bold sm:text-3xl">{t("title")}</h1>
      <p className="mt-3 max-w-md text-muted-foreground">{t("description")}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild size="xl">
          <Link href="/">
            <Home aria-hidden />
            {tCommon("backHome")}
          </Link>
        </Button>
        <Button asChild size="xl" variant="outline">
          <Link href="/events">
            <Compass aria-hidden />
            {tCommon("browseEvents")}
          </Link>
        </Button>
      </div>
    </section>
  );
}
