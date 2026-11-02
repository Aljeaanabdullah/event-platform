import { useId } from "react";

import type { CategorySlug } from "@/config/site";
import { cn } from "@/lib/utils";

/**
 * غلاف فني مولّد بالكود لكل تصنيف (SVG) — يُستخدم عندما لا يرفع المنظّم صورة غلاف،
 * وفي صفحات المعاينة للتطوير. بلا صور خارجية ولا تراخيص.
 * المشاهد: مسرح حفلة، قاعة بشاشة، ألعاب نارية فوق الأبراج، ملعب.
 */
type Scene = "concert" | "screen" | "fireworks" | "stadium";

const sceneFor: Record<CategorySlug, Scene> = {
  music: "concert",
  entertainment: "concert",
  theater: "concert",
  conferences: "screen",
  "tech-ai": "screen",
  business: "screen",
  education: "screen",
  workshops: "screen",
  exhibitions: "screen",
  family: "fireworks",
  outdoor: "fireworks",
  sports: "stadium",
};

const palettes: Record<Scene, [string, string, string]> = {
  concert: ["#1a0b3d", "#6d28d9", "#ec4899"],
  screen: ["#0b1240", "#3730a3", "#22d3ee"],
  fireworks: ["#120a33", "#4c1d95", "#f472b6"],
  stadium: ["#06152e", "#1d4ed8", "#a3e635"],
};

/** صف جمهور (رؤوس وأكتاف) كسيلويت */
function Crowd({ y, scale = 1, fill, seed = 1 }: { y: number; scale?: number; fill: string; seed?: number }) {
  const heads = [];
  for (let i = 0; i < 26; i++) {
    const x = i * 19 + ((i * 7 + seed * 13) % 9);
    const r = (7 + ((i * 3 + seed) % 4)) * scale;
    heads.push(<circle key={i} cx={x} cy={y - r * 1.2} r={r} />);
    heads.push(<rect key={`b${i}`} x={x - r * 1.5} y={y - r * 0.4} width={r * 3} height={r * 3} rx={r} />);
  }
  return <g fill={fill}>{heads}</g>;
}

export function CoverArt({
  category,
  className,
  label,
}: {
  category: CategorySlug;
  className?: string;
  label?: string;
}) {
  const id = useId().replace(/:/g, "");
  const scene = sceneFor[category];
  const [bg, mid, accent] = palettes[scene];

  return (
    <svg
      viewBox="0 0 480 270"
      preserveAspectRatio="xMidYMid slice"
      className={cn("size-full", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={bg} />
          <stop offset="1" stopColor={mid} />
        </linearGradient>
        <radialGradient id={`${id}-spot`} cx="0.5" cy="0.35" r="0.6">
          <stop offset="0" stopColor={accent} stopOpacity="0.75" />
          <stop offset="1" stopColor={accent} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-beam`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="1" stopColor={accent} stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}-blur`}>
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      <rect width="480" height="270" fill={`url(#${id}-bg)`} />
      <ellipse cx="240" cy="110" rx="260" ry="150" fill={`url(#${id}-spot)`} />

      {scene === "concert" ? (
        <g>
          {[-1, 1, -0.5, 0.5].map((d, i) => (
            <polygon
              key={i}
              points={`${240 + d * 150},0 ${240 + d * 150 + 14},0 ${240 + d * 40 + 60},200 ${240 + d * 40 - 60},200`}
              fill={`url(#${id}-beam)`}
              opacity={0.55}
            />
          ))}
          <rect
            x="60"
            y="150"
            width="360"
            height="12"
            rx="3"
            fill={accent}
            opacity="0.5"
            filter={`url(#${id}-blur)`}
          />
          {/* مؤدٍّ على المسرح */}
          <g fill="#0d0620">
            <circle cx="240" cy="104" r="13" />
            <path d="M216 168 Q218 122 240 118 Q262 122 264 168 Z" />
            <rect x="252" y="112" width="3" height="40" rx="1.5" transform="rotate(-20 252 112)" />
          </g>
          <Crowd y={262} fill="#0a0418" seed={2} />
          <Crowd y={278} scale={1.25} fill="#05020d" seed={5} />
        </g>
      ) : null}

      {scene === "screen" ? (
        <g>
          <rect
            x="130"
            y="40"
            width="220"
            height="120"
            rx="8"
            fill="#0a1033"
            stroke={accent}
            strokeWidth="2"
          />
          <rect
            x="130"
            y="40"
            width="220"
            height="120"
            rx="8"
            fill={accent}
            opacity="0.18"
            filter={`url(#${id}-blur)`}
          />
          {/* شبكة دوائر على الشاشة */}
          {[0, 1, 2, 3, 4].map((i) => (
            <circle
              key={i}
              cx={240}
              cy={100}
              r={14 + i * 12}
              fill="none"
              stroke={accent}
              strokeOpacity={0.5 - i * 0.08}
            />
          ))}
          <rect x="226" y="86" width="28" height="28" rx="5" fill="none" stroke="#ffffff" strokeWidth="2.5" />
          <rect x="234" y="94" width="12" height="12" rx="2" fill={accent} />
          <rect x="110" y="168" width="260" height="4" rx="2" fill={accent} opacity="0.6" />
          <Crowd y={262} fill="#060a24" seed={3} />
          <Crowd y={278} scale={1.25} fill="#03051a" seed={8} />
        </g>
      ) : null}

      {scene === "fireworks" ? (
        <g>
          {[
            [110, 70, 46, "#f472b6"],
            [340, 55, 54, "#c084fc"],
            [250, 105, 34, "#fde047"],
            [400, 120, 28, "#f472b6"],
          ].map(([cx, cy, r, c], i) => (
            <g key={i} stroke={c as string} strokeWidth="2" strokeLinecap="round" opacity="0.9">
              {Array.from({ length: 16 }, (_, k) => {
                const a = (k / 16) * Math.PI * 2;
                const R = r as number;
                return (
                  <line
                    key={k}
                    x1={(cx as number) + Math.cos(a) * R * 0.35}
                    y1={(cy as number) + Math.sin(a) * R * 0.35}
                    x2={(cx as number) + Math.cos(a) * R}
                    y2={(cy as number) + Math.sin(a) * R}
                  />
                );
              })}
            </g>
          ))}
          {/* أبراج الكويت */}
          <g fill="#0b0620">
            <path d="M226 270 L232 100 L236 100 L242 270 Z" />
            <circle cx="234" cy="170" r="20" />
            <circle cx="234" cy="128" r="12" />
            <path d="M260 270 L265 135 L268 135 L273 270 Z" />
            <circle cx="266.5" cy="185" r="16" />
            <path d="M200 270 L204 160 L206 160 L210 270 Z" />
          </g>
          <rect x="0" y="240" width="480" height="30" fill="#07041a" />
          <rect x="0" y="238" width="480" height="2" fill={accent} opacity="0.6" />
        </g>
      ) : null}

      {scene === "stadium" ? (
        <g>
          {[70, 410].map((x) => (
            <g key={x}>
              <rect x={x - 3} y="30" width="6" height="120" fill="#0b1a33" />
              <rect x={x - 22} y="22" width="44" height="14" rx="3" fill="#f8fafc" opacity="0.9" />
              <polygon
                points={`${x - 22},36 ${x + 22},36 ${x + 120 * Math.sign(240 - x)},220 ${x - 40 * Math.sign(240 - x)},220`}
                fill={`url(#${id}-beam)`}
                opacity="0.35"
              />
            </g>
          ))}
          <ellipse cx="240" cy="235" rx="230" ry="50" fill="#14532d" />
          <ellipse cx="240" cy="235" rx="170" ry="34" fill="none" stroke="#ffffff" strokeOpacity="0.5" />
          <line x1="240" y1="201" x2="240" y2="269" stroke="#ffffff" strokeOpacity="0.5" />
          <Crowd y={200} scale={0.6} fill="#071027" seed={4} />
        </g>
      ) : null}

      {label ? (
        <text x="16" y="28" fill="#ffffff" opacity="0.35" fontSize="12" fontFamily="monospace">
          {label}
        </text>
      ) : null}
    </svg>
  );
}
