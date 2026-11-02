"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** أقصى ميل بالدرجات — خفيف عمدًا حتى لا يعيق القراءة */
  maxTilt?: number;
};

/**
 * ميل ثلاثي الأبعاد خفيف يتبع المؤشر، مع لمعة ضوئية.
 * يعمل فقط مع الماوس (وليس اللمس) وعند عدم تفعيل "تقليل الحركة".
 * التحديث عبر requestAnimationFrame ومتغيرات CSS، بدون إعادة رسم React.
 */
export function TiltCard({ children, className, maxTilt = 6 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const canTilt = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    );
    if (!canTilt.matches) return;

    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width; // 0..1 من اليسار فيزيائيًا (مستقل عن RTL)
        const y = (e.clientY - rect.top) / rect.height;
        el.style.setProperty("--rx", `${(0.5 - y) * maxTilt * 2}deg`);
        el.style.setProperty("--ry", `${(x - 0.5) * maxTilt * 2}deg`);
        el.style.setProperty("--gx", `${x * 100}%`);
        el.style.setProperty("--gy", `${y * 100}%`);
        el.dataset.tilting = "true";
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(frame);
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
      delete el.dataset.tilting;
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [maxTilt]);

  return (
    <div ref={ref} className={cn("group/tilt relative [perspective:1000px]", className)}>
      <div className="relative h-full [transform:rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))] transition-transform duration-300 ease-out will-change-transform [transform-style:preserve-3d] group-data-[tilting=true]/tilt:duration-100">
        {children}
        {/* لمعة ضوئية تتبع المؤشر */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 rounded-2xl opacity-0 transition-opacity duration-300 group-data-[tilting=true]/tilt:opacity-100"
          style={{
            background:
              "radial-gradient(400px circle at var(--gx,50%) var(--gy,50%), color-mix(in oklch, white 14%, transparent), transparent 45%)",
          }}
        />
      </div>
    </div>
  );
}
