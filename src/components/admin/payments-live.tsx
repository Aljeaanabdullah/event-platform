"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { getBrowserClient } from "@/lib/supabase/client";

/** يعيد جلب الصفحة من الخادم عند تغيّر أي طلب أو دفعة (Realtime يطبّق RLS: للمدير كل التغييرات) */
export function PaymentsLive() {
  const router = useRouter();

  useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase) return;
    const refresh = () => router.refresh();
    const channel = supabase
      .channel("admin-payments")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
