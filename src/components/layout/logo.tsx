import { useId } from "react";

import { cn } from "@/lib/utils";

/** علامة الشعار: شريطان منحنيان متداخلان بتدرج بنفسجي → وردي (يوحي بتذكرة/حرف E) */
export function LogoMark({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9", className)} aria-hidden>
      <defs>
        <linearGradient id={`${id}-a`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a855f7" />
          <stop offset="1" stopColor="#ec4899" />
        </linearGradient>
        <linearGradient id={`${id}-b`} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <path
        d="M9 27c0-9.4 7.6-17 17-17h5a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-5c-5.5 0-10 4.5-10 10v2a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2v-2z"
        fill={`url(#${id}-a)`}
      />
      <path
        d="M31 13c0 9.4-7.6 17-17 17H9a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h5c5.5 0 10-4.5 10-10v-2a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2z"
        fill={`url(#${id}-b)`}
        opacity="0.9"
      />
    </svg>
  );
}

/** الشعار الكامل — "Event Platform" اسم مؤقت حتى اعتماد الهوية النهائية */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-bold tracking-tight", className)} dir="ltr">
      <LogoMark />
      <span className="text-lg leading-none">
        Event<span className="text-gradient-neon">Platform</span>
      </span>
    </span>
  );
}
