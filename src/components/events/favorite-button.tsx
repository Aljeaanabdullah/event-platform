"use client";

import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { useFavorites, useSession } from "@/components/providers/session-provider";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * زر المفضلة على البطاقة — حقيقي:
 *  - الزائر يُحوَّل لصفحة الدخول ثم يعود للصفحة نفسها.
 *  - المستخدم يضيف/يزيل مباشرة (RLS تسمح فقط بفعاليات منشورة وبصفوفه هو).
 */
export function FavoriteButton({ eventId, className }: { eventId: string; className?: string }) {
  const t = useTranslations("EventCard");
  const session = useSession();
  const { ids, toggle } = useFavorites();
  const router = useRouter();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const active = ids.has(eventId);

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (session.status !== "authenticated") {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname || pathname)}`);
      return;
    }
    setBusy(true);
    const ok = await toggle(eventId);
    setBusy(false);
    if (!ok) toast.error(t("favoriteError"));
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-pressed={active}
      aria-label={active ? t("removeFavorite") : t("addFavorite")}
      className={cn(
        "relative z-20 grid size-9 place-items-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur-md transition-all",
        "hover:scale-110 hover:bg-black/55 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none active:scale-95",
        className,
      )}
    >
      <Heart
        className={cn("size-[18px] transition-colors", active && "fill-pink-500 text-pink-500")}
        aria-hidden
      />
    </button>
  );
}
