import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AuthCard } from "@/components/auth/auth-card";
import { GoogleButton, OrDivider } from "@/components/auth/google-button";
import { LoginForm } from "@/components/auth/login-form";
import { authErrorCodes, type AuthErrorCode } from "@/features/auth/errors";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({ params }: PageProps<"/[locale]/login">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as "ar" | "en", namespace: "Auth.login" });
  return { title: t("submit") };
}

export default async function LoginPage({ searchParams }: PageProps<"/[locale]/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : null;
  const rawError = typeof sp.error === "string" ? sp.error : undefined;
  const initialError =
    rawError === "callback" || (authErrorCodes as readonly string[]).includes(rawError ?? "")
      ? (rawError as AuthErrorCode | "callback")
      : undefined;

  const t = await getTranslations("Auth.login");

  return (
    <AuthCard
      title={t("title")}
      subtitle={t("subtitle")}
      footer={
        <>
          {t("noAccount")}{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            {t("register")}
          </Link>
        </>
      }
    >
      <GoogleButton next={next} />
      <OrDivider label={t("orContinue")} />
      <LoginForm next={next} initialError={initialError} />
    </AuthCard>
  );
}
