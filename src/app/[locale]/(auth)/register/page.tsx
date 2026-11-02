import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AuthCard } from "@/components/auth/auth-card";
import { GoogleButton, OrDivider } from "@/components/auth/google-button";
import { RegisterForm } from "@/components/auth/register-form";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({ params }: PageProps<"/[locale]/register">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as "ar" | "en", namespace: "Auth.register" });
  return { title: t("title") };
}

export default async function RegisterPage({ params, searchParams }: PageProps<"/[locale]/register">) {
  const { locale } = await params;
  const sp = await searchParams;
  const asOrganizer = sp.type === "organizer";
  const t = await getTranslations("Auth.register");
  const tLogin = await getTranslations("Auth.login");

  return (
    <AuthCard
      title={t("title")}
      subtitle={t("subtitle")}
      footer={
        <>
          {t("haveAccount")}{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            {t("login")}
          </Link>
        </>
      }
    >
      {/* الدخول بـ Google ينشئ الحساب تلقائيًا؛ المنظّم يُوجَّه لنموذج الطلب بعده */}
      <GoogleButton next={asOrganizer ? `/${locale}/organizer/apply` : null} />
      <OrDivider label={tLogin("orContinue")} />
      <RegisterForm defaultAccountType={asOrganizer ? "organizer" : "customer"} />
    </AuthCard>
  );
}
