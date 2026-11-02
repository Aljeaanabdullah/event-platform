import { LogoMark } from "@/components/layout/logo";
import { cn } from "@/lib/utils";

import type { TicketLabels } from "./ticket-texture";

/**
 * نسخة ثابتة بـ CSS من المشهد: تذكرة فوق منصة متوهجة مع حلقات.
 * تظهر أثناء تحميل المشهد ثلاثي الأبعاد، وتبقى بديلًا دائمًا عند عدم دعم WebGL
 * أو عند تفعيل "تقليل الحركة" أو وضع توفير البيانات — بنفس الهوية البصرية.
 */
export function TicketFallback({ labels, className }: { labels: TicketLabels; className?: string }) {
  const rtl = labels.dir === "rtl";
  return (
    <div
      aria-hidden
      className={cn("relative size-full [perspective:1200px]", className)}
      data-testid="ticket-fallback"
    >
      {/* الهالة خلف التذكرة */}
      <div className="absolute top-[18%] left-1/2 h-[45%] w-[70%] -translate-x-1/2 rounded-full bg-brand-violet/40 blur-3xl" />

      {/* المنصة: شعاع + سطح + حواف نيون + حلقات أرضية */}
      <div className="absolute bottom-[6%] left-1/2 h-[30%] w-[64%] -translate-x-1/2">
        <div className="absolute inset-x-[8%] -top-[70%] bottom-[30%] bg-gradient-to-b from-brand-violet/0 via-brand-violet/15 to-brand-violet/35 [clip-path:polygon(18%_0,82%_0,100%_100%,0_100%)]" />
        <div className="absolute inset-x-[-14%] bottom-[2%] h-[34%] rounded-[50%] border border-brand-blue/70 shadow-[0_0_24px_var(--glow)]" />
        <div className="absolute inset-x-[-32%] bottom-[-8%] h-[44%] rounded-[50%] border border-brand-violet/60 opacity-70" />
        <div className="absolute inset-x-0 bottom-[10%] h-[38%] rounded-[50%] bg-gradient-to-b from-[#2a1265] to-[#0f0826] shadow-[0_18px_40px_-10px_rgba(0,0,0,0.6)]" />
        <div className="absolute inset-x-[3%] bottom-[30%] h-[30%] rounded-[50%] border-2 border-brand-violet bg-[#24104f] shadow-[0_0_30px_var(--glow-strong),inset_0_0_24px_var(--glow)]" />
        <div className="absolute inset-x-[24%] bottom-[37%] h-[16%] rounded-[50%] border border-brand-pink/80" />
      </div>

      {/* التذكرة */}
      <div className="absolute inset-x-0 top-[12%] grid place-items-center">
        <div
          dir={labels.dir}
          className="relative flex aspect-[32/17] w-[72%] max-w-[460px] [transform:rotateX(14deg)_rotateY(var(--tilt))_rotateZ(var(--roll))] overflow-hidden rounded-[18px] border border-violet-300/40 bg-[linear-gradient(135deg,#2a1065,#4c1d95_45%,#6d28d9_75%,#3b1a8f)] text-white shadow-[0_30px_80px_-20px_var(--glow-strong),0_0_0_1px_rgba(236,72,153,0.35)] [--roll:-9deg] [--tilt:-18deg] rtl:[--roll:9deg] rtl:[--tilt:18deg]"
          style={{
            maskImage:
              "radial-gradient(circle at var(--stub) 0, transparent 5.5%, black 5.7%), radial-gradient(circle at var(--stub) 100%, transparent 5.5%, black 5.7%)",
            maskComposite: "intersect",
            WebkitMaskComposite: "source-in",
            ["--stub" as string]: rtl ? "23.5%" : "76.5%",
          }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_20%,rgba(236,210,255,0.16)_32%,transparent_42%,transparent_60%,rgba(236,210,255,0.1)_68%,transparent_76%)]" />
          <div className="relative flex flex-1 flex-col items-center justify-center gap-[7%] p-[5%]">
            <span className="flex items-center gap-2 text-[clamp(0.85rem,2vw,1.3rem)] font-bold" dir="ltr">
              <LogoMark className="size-[1.6em]" />
              {labels.brand.replace(/\s+/g, "")}
            </span>
            <span className="rounded-full bg-gradient-to-r from-violet-600 to-pink-600 px-[0.9em] py-[0.25em] text-[clamp(0.75rem,1.8vw,1.15rem)] font-bold shadow-[0_0_24px_rgba(236,72,153,0.6)]">
              {labels.title}
            </span>
            <span className="text-[clamp(0.6rem,1.2vw,0.8rem)] opacity-80">{labels.subtitle}</span>
          </div>
          <div className="relative grid w-[23.5%] place-items-center border-s-2 border-dashed border-violet-200/60">
            <div className="flex h-[62%] w-[52%] flex-col justify-between rounded-md bg-white/90 p-[8%]">
              {[3, 1, 2, 1, 3, 2, 1, 3, 1, 2].map((h, i) => (
                <span key={i} className="block bg-[#1e1338]" style={{ height: h * 2 }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
