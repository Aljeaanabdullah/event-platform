"use client";

import { Building2, ImagePlus, Loader2, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/features/organizer/event-schema";
import { newLogoPath } from "@/features/organizer/logo";
import { updateOrganizerLogo } from "@/features/organizer/profile-actions";
import { getBrowserClient } from "@/lib/supabase/client";
import { EVENT_MEDIA_BUCKET, publicMediaUrl } from "@/lib/storage";

const extFor: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

/**
 * شعار الجهة: رفع مباشر من المتصفح إلى event-media/{orgId}/logo/ ثم حفظ المسار عبر Server Action.
 * سياسة الحاوية تمنع الكتابة خارج مجلد الجهة، والـ Action ترفض أي مسار لا يخص الجهة.
 * الملف القديم يبقى في التخزين (لا حذف تلقائي).
 */
export function LogoUploader({
  organizerId,
  logoPath,
  orgName,
}: {
  organizerId: string;
  logoPath: string | null;
  orgName: string;
}) {
  const t = useTranslations("OrganizerDashboard.logo");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const busy = uploading || pending;
  const url = publicMediaUrl(logoPath);

  function save(path: string | null, successKey: "saved" | "removed") {
    startTransition(async () => {
      const res = await updateOrganizerLogo(organizerId, path);
      if (!res.ok) {
        toast.error(t("failed"));
        return;
      }
      toast.success(t(successKey));
      router.refresh();
    });
  }

  async function upload(file: File | undefined) {
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      toast.error(t("badType"));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(t("tooLarge"));
      return;
    }
    const supabase = getBrowserClient();
    if (!supabase) return toast.error(t("failed"));

    setUploading(true);
    const path = newLogoPath(organizerId, extFor[file.type]);
    const { error } = await supabase.storage
      .from(EVENT_MEDIA_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false, cacheControl: "31536000" });
    setUploading(false);
    if (error) {
      toast.error(t("failed"));
      return;
    }
    save(path, "saved");
  }

  return (
    <section
      aria-labelledby="org-logo-title"
      className="glass mb-6 flex flex-wrap items-center gap-5 rounded-2xl p-5"
      data-testid="organizer-logo"
    >
      <div className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl border bg-muted">
        {busy ? (
          <Loader2 className="size-6 animate-spin text-primary" aria-label={t("uploading")} />
        ) : url ? (
          <Image
            src={url}
            alt={t("alt", { name: orgName })}
            fill
            sizes="80px"
            className="object-cover"
            data-testid="organizer-logo-image"
          />
        ) : (
          <Building2 className="size-8 text-muted-foreground" aria-hidden />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h2 id="org-logo-title" className="font-semibold">
          {t("title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("hint")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(",")}
            className="sr-only"
            id={`${organizerId}-logo`}
            aria-label={url ? t("replace") : t("upload")}
            onChange={(e) => upload(e.target.files?.[0])}
            disabled={busy}
            data-testid="logo-input"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus aria-hidden />
            {url ? t("replace") : t("upload")}
          </Button>
          {url ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-xl text-destructive"
              disabled={busy}
              onClick={() => save(null, "removed")}
            >
              <Trash2 aria-hidden />
              {t("remove")}
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
