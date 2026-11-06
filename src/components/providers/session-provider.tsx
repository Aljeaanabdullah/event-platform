"use client";

/**
 * حالة المستخدم في المتصفح (للعرض فقط: قائمة الحساب، الإشعارات، المفضلة).
 * لا تُستخدم لاتخاذ قرارات صلاحيات — تلك على الخادم وفي RLS.
 * نقرأها في المتصفح حتى تبقى الصفحات العامة ثابتة (Static) وسريعة.
 */
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { getBrowserClient } from "@/lib/supabase/client";

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

type FavoritesApi = {
  /** معرّفات الفعاليات المفضلة للمستخدم الحالي */
  ids: ReadonlySet<string>;
  /** يضيف/يزيل الفعالية. يُرجع false عند الفشل (ويُعاد الوضع السابق) */
  toggle: (eventId: string) => Promise<boolean>;
};

const SessionContext = createContext<SessionState>({ status: "loading" });
const FavoritesContext = createContext<FavoritesApi>({ ids: new Set(), toggle: async () => false });

export function SessionProvider({ children }: { children: React.ReactNode }) {
  // بدون إعداد Supabase في هذه البيئة يكون الزائر مجهولًا مباشرة (نفس النتيجة على الخادم والمتصفح)
  const [state, setState] = useState<SessionState>(() =>
    getBrowserClient() ? { status: "loading" } : { status: "anonymous" },
  );
  const [favorites, setFavorites] = useState<ReadonlySet<string>>(new Set());

  // المستخدم المعروض حاليًا: undefined قبل أول قراءة، null للزائر
  const loadedUserId = useRef<string | null | undefined>(undefined);
  const loadSeq = useRef(0);

  const load = useCallback(async (force = false) => {
    const supabase = getBrowserClient();
    if (!supabase) return;
    const seq = ++loadSeq.current;
    const { data } = await supabase.auth.getClaims();
    if (seq !== loadSeq.current) return;
    const userId = data?.claims?.sub ?? null;
    if (!force && userId === loadedUserId.current) return;
    if (!userId) {
      loadedUserId.current = null;
      setState({ status: "anonymous" });
      setFavorites(new Set());
      return;
    }
    const [{ data: profile }, { count }, { data: favs }] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, email, avatar_url, platform_role")
        .eq("id", userId)
        .single(),
      supabase.from("organizer_members").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("favorites").select("event_id").eq("user_id", userId),
    ]);
    if (seq !== loadSeq.current) return;
    loadedUserId.current = userId;
    setFavorites(new Set((favs ?? []).map((f) => f.event_id)));
    setState({
      status: "authenticated",
      user: {
        id: userId,
        name: profile?.full_name ?? null,
        email: profile?.email ?? (data?.claims?.email as string | undefined) ?? null,
        avatarUrl: profile?.avatar_url ?? null,
        isAdmin: profile?.platform_role === "admin",
        isOrganizerMember: (count ?? 0) > 0,
      },
    });
  }, []);

  useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") load(true);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [load]);

  // الدخول يتم في Server Action دون إعادة تحميل الصفحة، فلا يصل onAuthStateChange للمتصفح:
  // نعيد قراءة الجلسة عند كل تنقّل (الاستعلامات لا تتكرر إلا إذا تغيّر المستخدم).
  const pathname = usePathname();
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load, pathname]);

  const userId = state.status === "authenticated" ? state.user.id : null;

  const toggle = useCallback(
    async (eventId: string) => {
      if (!userId) return false;
      const wasFavorite = favorites.has(eventId);
      // تحديث متفائل للواجهة، ثم التراجع إذا رفضت قاعدة البيانات (RLS: فعاليات منشورة فقط)
      const next = new Set(favorites);
      if (wasFavorite) next.delete(eventId);
      else next.add(eventId);
      setFavorites(next);

      const supabase = getBrowserClient();
      if (!supabase) {
        setFavorites(favorites);
        return false;
      }
      const { error } = wasFavorite
        ? await supabase.from("favorites").delete().eq("user_id", userId).eq("event_id", eventId)
        : await supabase.from("favorites").insert({ user_id: userId, event_id: eventId });

      if (error) {
        setFavorites(favorites);
        return false;
      }
      return true;
    },
    [favorites, userId],
  );

  const favoritesApi = useMemo(() => ({ ids: favorites, toggle }), [favorites, toggle]);

  return (
    <SessionContext.Provider value={state}>
      <FavoritesContext.Provider value={favoritesApi}>{children}</FavoritesContext.Provider>
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);
export const useFavorites = () => useContext(FavoritesContext);
