"use client";

/**
 * حالة المستخدم في المتصفح (للعرض فقط: قائمة الحساب في الـ Header).
 * لا تُستخدم لاتخاذ قرارات صلاحيات — تلك على الخادم وفي RLS.
 * نقرأها في المتصفح حتى تبقى الصفحات العامة ثابتة (Static) وسريعة.
 */
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export type SessionUser = {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
  isOrganizerMember: boolean;
};

type SessionState =
  { status: "loading" } | { status: "anonymous" } | { status: "authenticated"; user: SessionUser };

const SessionContext = createContext<SessionState>({ status: "loading" });

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: "loading" });
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data } = await supabase.auth.getClaims();
      const userId = data?.claims?.sub;
      if (!userId) {
        if (!cancelled) setState({ status: "anonymous" });
        return;
      }
      const [{ data: profile }, { count }] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, email, avatar_url, platform_role")
          .eq("id", userId)
          .single(),
        supabase.from("organizer_members").select("id", { count: "exact", head: true }).eq("user_id", userId),
      ]);
      if (cancelled) return;
      setState({
        status: "authenticated",
        user: {
          id: userId,
          name: profile?.full_name ?? null,
          email: profile?.email ?? (data.claims.email as string | undefined) ?? null,
          avatarUrl: profile?.avatar_url ?? null,
          isAdmin: profile?.platform_role === "admin",
          isOrganizerMember: (count ?? 0) > 0,
        },
      });
    }

    load();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") load();
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext);
