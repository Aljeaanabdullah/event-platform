import { KeyRound } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AuthCard } from "@/components/auth/auth-card";
import { NewPasswordForm } from "@/components/auth/new-password-form";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getUserId } from "@/lib/auth/session";

export async function generateMetadata({ params }: PageProps<"/[locale]/reset-password">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as "ar" | "en", namespace: "Auth.reset" });
  return { title: t("title") };
}

/**
 * يصل المستخدم هنا عبر رابط الاستعادة بعد أن يحوّل /auth/callback الرمز إلى جلسة مؤقتة.
 * بدون جلسة صالحة نعرض حالة "انتهت صلاحية الرابط".
 */
export default async function ResetPasswordPage() {
  const t = await getTranslations("Auth.reset");
  const userId = await getUserId();

  if (!userId) {
    return (
      <AuthCard title={t("expiredTitle")} subtitle={t("expiredBody")}>
        <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
          <KeyRound className="size-7" aria-hidden />
        </div>
        <Button asChild size="xl" className="w-full">
          <Link href="/forgot-password">{t("requestNew")}</Link>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t("title")} subtitle={t("subtitle")}>
      <NewPasswordForm
        redirectTo="/account"
        labels={{
          password: t("password"),
          confirmPassword: t("confirmPassword"),
          submit: t("submit"),
          success: t("success"),
        }}
      />
    </AuthCard>
  );
}
