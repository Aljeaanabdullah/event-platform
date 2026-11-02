"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function ToastDemo() {
  const t = useTranslations("DevShowcase");
  return (
    <div className="flex flex-wrap gap-3">
      <Button onClick={() => toast.success(t("sampleSuccess"))}>{t("toastSuccess")}</Button>
      <Button variant="destructive" onClick={() => toast.error(t("sampleError"))}>
        {t("toastError")}
      </Button>
      <Button variant="outline" onClick={() => toast.info(t("sampleInfo"))}>
        {t("toastInfo")}
      </Button>
    </div>
  );
}
