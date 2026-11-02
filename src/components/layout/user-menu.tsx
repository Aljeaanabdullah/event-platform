"use client";

import { Briefcase, LogOut, ShieldCheck, User } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

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
import { Skeleton } from "@/components/ui/skeleton";
import { signOut } from "@/features/auth/actions";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import { routes } from "./nav-links";

function initials(name: string | null, email: string | null) {
  const source = name?.trim() || email || "?";
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export function UserAvatar({
  name,
  email,
  url,
  className,
}: {
  name: string | null;
  email: string | null;
  url: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "bg-gradient-brand grid size-8 shrink-0 place-items-center overflow-hidden rounded-full text-xs font-semibold text-white",
        className,
      )}
      aria-hidden
    >
      {url ? (
        // صورة Google أو المستخدم — صغيرة جدًا فلا حاجة لتحسين next/image
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        initials(name, email)
      )}
    </span>
  );
}

/** قائمة الحساب في الـ Header: زر الدخول للزائر، وقائمة منسدلة للمستخدم */
export function UserMenu() {
  const session = useSession();
  const t = useTranslations("UserMenu");
  const tNav = useTranslations("Nav");
  const locale = useLocale();

  if (session.status === "loading") {
    return <Skeleton className="size-8 rounded-full" aria-hidden />;
  }

  if (session.status === "anonymous") {
    return (
      <Button asChild variant="ghost" className="hidden md:inline-flex" data-testid="header-login">
        <Link href={routes.login}>{tNav("login")}</Link>
      </Button>
    );
  }

  const { user } = session;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label={t("label")}
          data-testid="user-menu"
        >
          <UserAvatar name={user.name} email={user.email} url={user.avatarUrl} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="grid gap-0.5">
          <span className="truncate font-semibold">{user.name ?? user.email}</span>
          {user.name ? (
            <span className="truncate text-xs font-normal text-muted-foreground" dir="ltr">
              {user.email}
            </span>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={routes.account}>
            <User aria-hidden />
            {t("account")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={user.isOrganizerMember ? "/organizer" : "/organizer/apply"}>
            <Briefcase aria-hidden />
            {user.isOrganizerMember ? t("organizer") : t("becomeOrganizer")}
          </Link>
        </DropdownMenuItem>
        {user.isAdmin ? (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <ShieldCheck aria-hidden />
              {t("admin")}
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => signOut(locale)} data-testid="sign-out">
          <LogOut aria-hidden />
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
