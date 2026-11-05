"use client";

import { Check, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/** مشاركة عبر قائمة المشاركة في الجهاز، وإلا نسخ الرابط */
export function ShareButton({ title, url }: { title: string; url: string }) {
  const t = useTranslations("EventDetails");
  const [copied, setCopied] = useState(false);

  async function share() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t("linkCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("copyFailed"));
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="glass rounded-full"
      onClick={share}
      data-testid="share-button"
    >
      {copied ? <Check aria-hidden /> : <Share2 aria-hidden />}
      {t("share")}
    </Button>
  );
}
