"use client";

import { Briefcase, ChevronDown, LogOut, ShieldCheck, User, Receipt, Ticket } from "lucide-react";
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
    return <Skeleton className="h-10 w-10 rounded-full md:w-36" aria-hidden />;
  }

  if (session.status === "anonymous") {
    return (
      <Button
        asChild
        className="hidden h-10 rounded-full bg-gradient-neon px-5 text-white glow-primary hover:opacity-95 md:inline-flex"
        data-testid="header-login"
      >
        <Link href={routes.login}>{tNav("login")}</Link>
      </Button>
    );
  }

  const { user } = session;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("label")}
          data-testid="user-menu"
          className="glass flex h-10 items-center gap-2 rounded-full p-1 pe-1 transition-all hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none md:pe-3"
        >
          <UserAvatar name={user.name} email={user.email} url={user.avatarUrl} />
          <span className="hidden max-w-32 truncate text-sm font-semibold md:inline">
            {t("greeting", { name: (user.name ?? user.email ?? "").split(/[s@]/)[0] })}
          </span>
          <ChevronDown className="hidden size-4 text-muted-foreground md:block" aria-hidden />
        </button>
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
          <Link href="/account/tickets">
            <Ticket aria-hidden />
            {t("tickets")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/orders">
            <Receipt aria-hidden />
            {t("orders")}
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
