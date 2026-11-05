/**
 * أدوات الجلسة والصلاحيات على الخادم.
 * كل التحقق هنا يعتمد على getClaims() (JWT موقّع ومتحقق منه) وعلى قاعدة البيانات،
 * وليس على أي قيمة قادمة من المتصفح.
 */
import "server-only";

import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type MemberRole = Database["public"]["Enums"]["member_role"];
type OrganizerStatus = Database["public"]["Enums"]["organizer_status"];

export type Membership = {
  organizerId: string;
  role: MemberRole;
  slug: string;
  nameAr: string;
  nameEn: string;
  status: OrganizerStatus;
  rejectionReason: string | null;
  logoPath: string | null;
};

export type UserContext = {
  userId: string;
  email: string | null;
  profile: Profile;
  memberships: Membership[];
  isAdmin: boolean;
  isOrganizer: boolean;
  /** هل يملك حساب بريد/كلمة مرور (وليس Google فقط) */
  hasPassword: boolean;
};

/** معرّف المستخدم الحالي أو null — مخزّن مؤقتًا لكل طلب */
export const getUserId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims?.sub as string | undefined) ?? null;
});

/** سياق المستخدم الكامل: الملف الشخصي، العضويات، والدور — من قاعدة البيانات */
export const getUserContext = cache(async (): Promise<UserContext | null> => {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) return null;

  const [{ data: profile }, { data: members }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", claims.sub).single(),
    supabase
      .from("organizer_members")
      .select("role, organizer_id, organizers (slug, name_ar, name_en, status, rejection_reason, logo_path)")
      .eq("user_id", claims.sub),
  ]);
  if (!profile) return null;

  const memberships: Membership[] = (members ?? []).flatMap((m) =>
    m.organizers
      ? [
          {
            organizerId: m.organizer_id,
            role: m.role,
            slug: m.organizers.slug,
            nameAr: m.organizers.name_ar,
            nameEn: m.organizers.name_en,
            status: m.organizers.status,
            rejectionReason: m.organizers.rejection_reason,
            logoPath: m.organizers.logo_path,
          },
        ]
      : [],
  );

  const providers = ((claims.app_metadata as { providers?: string[] } | undefined)?.providers ??
    []) as string[];

  return {
    userId: claims.sub,
    email: (claims.email as string | undefined) ?? profile.email,
    profile,
    memberships,
    isAdmin: profile.platform_role === "admin",
    isOrganizer: memberships.some((m) => m.status === "approved"),
    hasPassword: providers.includes("email"),
  };
});

/** يتطلب مستخدمًا مسجّلًا، وإلا يحوّل لصفحة الدخول مع العودة لنفس الصفحة */
export async function requireUser(locale: Locale, returnPath: string): Promise<UserContext> {
  const ctx = await getUserContext();
  if (!ctx) redirect(`/${locale}/login?next=${encodeURIComponent(returnPath)}`);
  return ctx;
}

/**
 * يتطلب مديرًا. لغير المدير نُرجع 404 بدل 403 حتى لا نكشف وجود لوحة الإدارة.
 * الحماية الحقيقية للبيانات في RLS — هذا يمنع عرض الصفحة فقط.
 */
export async function requireAdmin(locale: Locale, returnPath: string): Promise<UserContext> {
  const ctx = await requireUser(locale, returnPath);
  if (!ctx.isAdmin) notFound();
  return ctx;
}
