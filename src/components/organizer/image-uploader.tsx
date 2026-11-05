"use client";

import { ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ALLOWED_IMAGE_TYPES, MAX_GALLERY_IMAGES, MAX_IMAGE_BYTES } from "@/features/organizer/event-schema";
import { getBrowserClient } from "@/lib/supabase/client";
import { EVENT_MEDIA_BUCKET, publicMediaUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

const extFor: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

/**
 * رفع الصور مباشرة من المتصفح إلى Supabase Storage.
 * الأمان في الخادم: سياسة الحاوية تسمح بالكتابة فقط لأعضاء الجهة (owner/manager) داخل مجلدها،
 * والحاوية نفسها تقيّد الأنواع (JPEG/PNG/WebP/AVIF — بلا SVG) والحجم (5MB).
 * هنا نتحقق مسبقًا فقط لتجربة أفضل. اسم الملف عشوائي (UUID) ولا يُستخدم اسم المستخدم.
 */
export function ImageUploader({
  organizerId,
  cover,
  gallery,
  onChange,
}: {
  organizerId: string;
  cover: string | null;
  gallery: string[];
  onChange: (next: { cover: string | null; gallery: string[] }) => void;
}) {
  const t = useTranslations("EventForm.images");
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const all = [cover, ...gallery].filter((p): p is string => p !== null);
  const remaining = MAX_GALLERY_IMAGES + 1 - all.length;

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    const supabase = getBrowserClient();
    if (!supabase) return toast.error(t("uploadFailed"));

    const accepted = [...files].slice(0, remaining).filter((file) => {
      if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
        toast.error(t("badType", { name: file.name }));
        return false;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error(t("tooLarge", { name: file.name }));
        return false;
      }
      return true;
    });

    setUploading((n) => n + accepted.length);
    const uploaded: string[] = [];
    for (const file of accepted) {
      const path = `${organizerId}/events/${crypto.randomUUID()}.${extFor[file.type]}`;
      const { error } = await supabase.storage
        .from(EVENT_MEDIA_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false, cacheControl: "31536000" });
      setUploading((n) => n - 1);
      if (error) toast.error(t("uploadFailed"));
      else uploaded.push(path);
    }
    if (!uploaded.length) return;
    const nextCover = cover ?? uploaded.shift() ?? null;
    onChange({ cover: nextCover, gallery: [...gallery, ...uploaded].slice(0, MAX_GALLERY_IMAGES) });
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(path: string) {
    // الحذف من النموذج فقط؛ الملف يبقى في التخزين حتى لا نكسر نسخة منشورة تعتمد عليه
    if (path === cover) onChange({ cover: gallery[0] ?? null, gallery: gallery.slice(1) });
    else onChange({ cover, gallery: gallery.filter((p) => p !== path) });
  }

  function makeCover(path: string) {
    onChange({ cover: path, gallery: [...(cover ? [cover] : []), ...gallery.filter((p) => p !== path)] });
  }

  return (
    <div className="grid gap-4">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" data-testid="uploaded-images">
        {all.map((path) => {
          const url = publicMediaUrl(path);
          const isCover = path === cover;
          return (
            <li
              key={path}
              className={cn(
                "relative aspect-[4/3] overflow-hidden rounded-2xl border",
                isCover && "ring-2 ring-primary",
              )}
            >
              {url ? <Image src={url} alt="" fill sizes="33vw" className="object-cover" /> : null}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/55 p-1.5 text-white">
                {isCover ? (
                  <span className="flex items-center gap-1 px-1 text-xs font-semibold">
                    <Star className="size-3.5 fill-current" aria-hidden />
                    {t("cover")}
                  </span>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-white"
                    onClick={() => makeCover(path)}
                  >
                    {t("makeCover")}
                  </Button>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-7 text-white"
                  aria-label={t("remove")}
                  onClick={() => remove(path)}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            </li>
          );
        })}
        {Array.from({ length: uploading }, (_, i) => (
          <li key={`u${i}`} className="grid aspect-[4/3] place-items-center rounded-2xl border border-dashed">
            <Loader2 className="size-6 animate-spin text-primary" aria-label={t("uploading")} />
          </li>
        ))}
      </ul>

      <div>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_IMAGE_TYPES.join(",")}
          multiple
          className="sr-only"
          id={`${organizerId}-images`}
          onChange={(e) => upload(e.target.files)}
          disabled={remaining <= 0 || uploading > 0}
          data-testid="image-input"
        />
        <Button
          type="button"
          variant="outline"
          className="glass rounded-xl"
          disabled={remaining <= 0 || uploading > 0}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus aria-hidden />
          {t("add")}
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">{t("hint", { max: MAX_GALLERY_IMAGES + 1 })}</p>
      </div>
    </div>
  );
}
