"use client";

import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Error");
  const tCommon = useTranslations("Common");

  useEffect(() => {
    // يظهر في سجلات المتصفح؛ تفاصيل الخطأ الحقيقية تُسجَّل على الخادم ولا تُعرض للمستخدم
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-20">
      <ErrorState
        title={t("title")}
        description={t("description")}
        action={
          <div className="flex flex-col items-center gap-3">
            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={reset}>
                <RotateCcw aria-hidden />
                {tCommon("retry")}
              </Button>
              <Button asChild variant="outline">
                <Link href="/">{tCommon("backHome")}</Link>
              </Button>
            </div>
            {error.digest ? (
              <p className="text-xs text-muted-foreground" dir="ltr">
                {t("reference", { digest: error.digest })}
              </p>
            ) : null}
          </div>
        }
      />
    </div>
  );
}
