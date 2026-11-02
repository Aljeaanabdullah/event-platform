"use client";

import { Bell, CheckCheck } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { useSession } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/navigation";
import { getBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  title_ar: string;
  title_en: string;
  body_ar: string | null;
  body_en: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

/**
 * جرس الإشعارات — بيانات حقيقية من جدول notifications (RLS: المستخدم يرى إشعاراته فقط).
 * يظهر للمستخدم المسجّل فقط.
 */
export function NotificationsBell() {
  const session = useSession();
  const t = useTranslations("Notifications");
  const locale = useLocale();
  const format = useFormatter();
  const [items, setItems] = useState<Notification[]>([]);

  const userId = session.status === "authenticated" ? session.user.id : null;

  const fetchLatest = useCallback(async () => {
    const supabase = getBrowserClient();
    if (!supabase) return { data: [] as Notification[] };
    return supabase
      .from("notifications")
      .select("id, title_ar, title_en, body_ar, body_en, link, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(6);
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetchLatest().then(({ data }) => {
      if (!cancelled) setItems(data ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchLatest, userId]);

  async function refresh() {
    const { data } = await fetchLatest();
    setItems(data ?? []);
  }

  if (!userId) return null;

  const unread = items.filter((n) => !n.read_at).length;

  async function markAllRead() {
    const ids = items.filter((n) => !n.read_at).map((n) => n.id);
    if (ids.length === 0) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    await getBrowserClient()?.from("notifications").update({ read_at: now }).in("id", ids);
  }

  return (
    <DropdownMenu onOpenChange={(open) => open && refresh()}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="glass relative size-10 rounded-full"
          aria-label={unread > 0 ? t("labelUnread", { count: unread }) : t("label")}
          data-testid="notifications-bell"
        >
          <Bell className="size-[18px]" aria-hidden />
          {unread > 0 ? (
            <span
              className="absolute end-2 top-2 size-2 rounded-full bg-brand-pink ring-2 ring-background"
              aria-hidden
            />
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          {t("title")}
          {unread > 0 ? (
            <button
              type="button"
              onClick={markAllRead}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary"
            >
              <CheckCheck className="size-3.5" aria-hidden />
              {t("markAllRead")}
            </button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          items.map((n) => (
            <DropdownMenuItem key={n.id} asChild className="items-start">
              <Link href={n.link ?? "/account"} className="grid gap-0.5">
                <span className={cn("text-sm", !n.read_at && "font-semibold")}>
                  {locale === "ar" ? n.title_ar : n.title_en}
                </span>
                {(locale === "ar" ? n.body_ar : n.body_en) ? (
                  <span className="line-clamp-2 text-xs text-muted-foreground">
                    {locale === "ar" ? n.body_ar : n.body_en}
                  </span>
                ) : null}
                <span className="text-[11px] text-muted-foreground">
                  {format.relativeTime(new Date(n.created_at))}
                </span>
              </Link>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
