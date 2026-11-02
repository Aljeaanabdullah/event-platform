"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

/**
 * خلفية تفاعلية ناعمة: هالات ضوئية بألوان الهوية تنجرف ببطء نحو المؤشر.
 * CSS فقط (بدون WebGL) لتبقى خفيفة على كل الأجهزة، والألوان من متغيرات الثيم
 * فتتغير تلقائيًا بين الوضع الفاتح والداكن.
 */
export function InteractiveBackdrop({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mq = window.matchMedia("(hover: hover) and (prefers-reduced-motion: no-preference)");
    if (!mq.matches) return;

    let frame = 0;
    let tx = 0.5,
      ty = 0.3,
      cx = 0.5,
      cy = 0.3;
    const onMove = (e: PointerEvent) => {
      tx = e.clientX / window.innerWidth;
      ty = e.clientY / window.innerHeight;
    };
    // تخميد يدوي: الهالة تلحق بالمؤشر ببطء بدل القفز
    const tick = () => {
      cx += (tx - cx) * 0.05;
      cy += (ty - cy) * 0.05;
      el.style.setProperty("--bx", `${cx * 100}%`);
      el.style.setProperty("--by", `${cy * 100}%`);
      frame = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(frame);
      if (entry.isIntersecting) frame = requestAnimationFrame(tick);
    });
    io.observe(el);
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <div className="hero-glow absolute inset-0" />
      <div className="bg-grid absolute inset-0" />
      <div
        className="absolute size-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 blur-3xl"
        style={{
          left: "var(--bx, 50%)",
          top: "var(--by, 30%)",
          background: "radial-gradient(circle, var(--hero-glow-1), transparent 65%)",
        }}
      />
      <div className="absolute -end-40 top-1/3 size-[30rem] rounded-full bg-[radial-gradient(circle,var(--hero-glow-2),transparent_65%)] blur-3xl motion-safe:animate-[drift_18s_ease-in-out_infinite_alternate]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}
