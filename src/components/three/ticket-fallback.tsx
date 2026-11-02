import { cn } from "@/lib/utils";

import type { TicketLabels } from "./ticket-texture";

/**
 * تذكرة ثابتة بـ CSS فقط: تظهر أثناء تحميل المشهد ثلاثي الأبعاد،
 * وتبقى بديلًا دائمًا عند عدم دعم WebGL أو عند تفعيل "تقليل الحركة" أو وضع توفير البيانات.
 */
export function TicketFallback({ labels, className }: { labels: TicketLabels; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("grid size-full place-items-center [perspective:1200px]", className)}
      data-testid="ticket-fallback"
    >
      <div
        dir={labels.dir}
        className="bg-gradient-brand relative flex aspect-[32/17] w-[82%] max-w-[520px] [transform:rotateX(10deg)_rotateY(var(--tilt))_rotateZ(-4deg)] overflow-hidden rounded-[18px] text-white shadow-[0_40px_80px_-30px_color-mix(in_oklch,var(--brand-violet)_70%,transparent)] [--tilt:-16deg] rtl:[--tilt:16deg]"
        style={{
          // فتحتا خط القطع
          maskImage:
            "radial-gradient(circle at var(--stub) 0, transparent 5.5%, black 5.7%), radial-gradient(circle at var(--stub) 100%, transparent 5.5%, black 5.7%)",
          maskComposite: "intersect",
          WebkitMaskComposite: "source-in",
          ["--stub" as string]: labels.dir === "rtl" ? "23%" : "77%",
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_30%_15%,rgba(255,255,255,0.3),transparent)]" />
        <div className="relative flex flex-1 flex-col justify-between p-[6%]">
          <span className="text-[clamp(0.6rem,1.4vw,0.85rem)] font-semibold tracking-widest opacity-80">
            {labels.brand.toUpperCase()}
          </span>
          <span className="text-[clamp(1.5rem,4.5vw,2.75rem)] leading-none font-bold">{labels.title}</span>
          <span className="text-[clamp(0.7rem,1.5vw,0.95rem)] opacity-85">{labels.subtitle}</span>
        </div>
        <div className="relative grid w-[23%] place-items-center border-s-2 border-dashed border-white/50">
          <div className="grid size-[58%] grid-cols-3 gap-[6%] rounded-md bg-white p-[10%]">
            {[1, 0, 1, 0, 1, 1, 1, 0, 1].map((on, i) => (
              <span key={i} className={on ? "bg-indigo-950" : ""} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
