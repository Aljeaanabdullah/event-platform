"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import type { SceneQuality } from "./hero-scene";
import { TicketFallback } from "./ticket-fallback";
import type { TicketLabels } from "./ticket-texture";

// تحميل كسول: مكتبة Three.js لا تدخل في حزمة الصفحة الأولى إطلاقًا
const HeroScene = dynamic(() => import("./hero-scene"), { ssr: false });

type Capability = { mode: "static" } | { mode: "3d"; quality: SceneQuality; followPointer: boolean };

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/** يقرر هل نعرض المشهد ثلاثي الأبعاد، وبأي جودة، حسب قدرات الجهاز وتفضيلات المستخدم */
function detectCapability(): Capability {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion || nav.connection?.saveData || !supportsWebGL()) return { mode: "static" };

  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = window.innerWidth < 768;
  const weak = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
  return {
    mode: "3d",
    quality: weak || small ? "low" : "high",
    followPointer: !coarse,
  };
}

export function HeroVisual({ labels, className }: { labels: TicketLabels; className?: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [capability, setCapability] = useState<Capability | null>(null);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);

  // نبدأ بعد أن يصبح المتصفح خاملًا حتى لا نؤخر تفاعل المستخدم مع الصفحة
  useEffect(() => {
    const run = () => setCapability(detectCapability());
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(run, { timeout: 1500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(run, 300);
    return () => clearTimeout(id);
  }, []);

  // إيقاف الرسم عندما يخرج المشهد من الشاشة
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      rootMargin: "100px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const handleReady = useCallback(() => setReady(true), []);
  const show3d = capability?.mode === "3d";

  return (
    <div
      ref={container}
      className={cn("relative", className)}
      data-testid="hero-visual"
      data-mode={capability?.mode ?? "pending"}
    >
      {/* البديل الثابت يبقى ظاهرًا حتى يصبح المشهد جاهزًا، ثم يتلاشى بسلاسة */}
      <TicketFallback
        labels={labels}
        className={cn("absolute inset-0 transition-opacity duration-700", show3d && ready && "opacity-0")}
      />
      {show3d ? (
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-700",
            ready ? "opacity-100" : "opacity-0",
          )}
        >
          <HeroScene
            labels={labels}
            quality={capability.quality}
            followPointer={capability.followPointer}
            active={visible}
            onReady={handleReady}
          />
        </div>
      ) : null}
    </div>
  );
}
