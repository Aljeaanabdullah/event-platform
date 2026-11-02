import { Briefcase, LogOut, ShieldCheck, Ticket } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";

import { ProfileForm } from "@/components/account/profile-form";
import { PageHeader, SectionCard } from "@/components/account/section-card";
import { NewPasswordForm } from "@/components/auth/new-password-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { signOut } from "@/features/auth/actions";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireUser } from "@/lib/auth/session";

export async function generateMetadata({ params }: PageProps<"/[locale]/account">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "Account" });
  return { title: t("title"), robots: { index: false } };
}

export default async function AccountPage({ params }: PageProps<"/[locale]/account">) {
  const locale = (await params).locale as Locale;
  // proxy.ts يحوّل غير المسجلين مسبقًا، وهذا تحقق ثانٍ على الخادم
  const user = await requireUser(locale, `/${locale}/account`);
  const t = await getTranslations("Account");
  const format = await getFormatter();

  const pendingOrg = user.memberships.some((m) => m.status === "pending");
  const roles = [
    { show: true, icon: Ticket, label: t("role.customer") },
    { show: user.isOrganizer, icon: Briefcase, label: t("role.organizer") },
    { show: !user.isOrganizer && pendingOrg, icon: Briefcase, label: t("role.organizerPending") },
    { show: user.isAdmin, icon: ShieldCheck, label: t("role.admin") },
  ].filter((r) => r.show);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        title={t("title")}
        subtitle={t("memberSince", {
          date: format.dateTime(new Date(user.profile.created_at), { dateStyle: "long" }),
        })}
      />

      <div className="grid gap-6">
        <SectionCard id="role" title={t("role.title")}>
          <div className="flex flex-wrap gap-2" data-testid="account-roles">
            {roles.map(({ icon: Icon, label }) => (
              <Badge key={label} variant="secondary" className="gap-1.5 px-3 py-1 text-sm">
                <Icon className="size-3.5" aria-hidden />
                {label}
              </Badge>
            ))}
          </div>
          {user.memberships.length === 0 ? (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-accent/50 p-4">
              <div>
                <p className="font-medium">{t("organizerCta.title")}</p>
                <p className="text-sm text-muted-foreground">{t("organizerCta.body")}</p>
              </div>
              <Button asChild variant="outline">
                <Link href="/organizer/apply">{t("organizerCta.button")}</Link>
              </Button>
            </div>
          ) : null}
        </SectionCard>

        <SectionCard id="profile" title={t("profile.title")} description={t("profile.description")}>
          <ProfileForm
            email={user.email}
            defaults={{
              fullName: user.profile.full_name ?? "",
              phone: user.profile.phone ?? "",
              preferredLocale: user.profile.preferred_locale,
            }}
          />
        </SectionCard>

        <SectionCard id="security" title={t("security.title")} description={t("security.description")}>
          {!user.hasPassword ? (
            <p className="mb-4 text-sm text-muted-foreground">{t("security.googleOnly")}</p>
          ) : null}
          <div className="max-w-md">
            <NewPasswordForm
              labels={{
                password: t("security.newPassword"),
                confirmPassword: t("security.confirmPassword"),
                submit: t("security.changePassword"),
                success: t("security.passwordChanged"),
              }}
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t pt-6">
            <form action={signOut.bind(null, locale, "local")}>
              <Button type="submit" variant="outline">
                <LogOut aria-hidden />
                {t("security.signOut")}
              </Button>
            </form>
            <form action={signOut.bind(null, locale, "global")}>
              <Button type="submit" variant="destructive" title={t("security.signOutAllHint")}>
                {t("security.signOutAll")}
              </Button>
            </form>
            <p className="w-full text-xs text-muted-foreground">{t("security.signOutAllHint")}</p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
