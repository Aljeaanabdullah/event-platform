import { cn } from "@/lib/utils";

/**
 * رسم متجهي (SVG) لأفق مدينة الكويت مع أبراج الكويت الثلاثة وانعكاسها على الماء.
 * مرسوم بالكود بالكامل: بلا صور خارجية أو تراخيص، خفيف، ويتلوّن حسب الثيم عبر متغيرات CSS.
 * زخرفي فقط (aria-hidden).
 */

// مبانٍ ثابتة (حتمية) حتى لا يختلف الرسم بين الخادم والمتصفح
const buildings = [
  { x: 6, w: 26, h: 120 },
  { x: 34, w: 18, h: 168 },
  { x: 54, w: 30, h: 96 },
  { x: 86, w: 16, h: 210 },
  { x: 104, w: 24, h: 140 },
  { x: 236, w: 22, h: 150 },
  { x: 260, w: 16, h: 230 },
  { x: 278, w: 28, h: 120 },
  { x: 308, w: 20, h: 186 },
  { x: 330, w: 34, h: 104 },
  { x: 366, w: 18, h: 260 },
  { x: 386, w: 26, h: 150 },
  { x: 414, w: 20, h: 196 },
  { x: 436, w: 32, h: 118 },
  { x: 470, w: 18, h: 170 },
  { x: 490, w: 30, h: 136 },
  { x: 522, w: 22, h: 210 },
  { x: 546, w: 26, h: 112 },
  { x: 574, w: 26, h: 160 },
];

const HORIZON = 380;

function windows(b: (typeof buildings)[number], i: number) {
  const rows = Math.floor((b.h - 12) / 14);
  const cols = Math.max(1, Math.floor((b.w - 6) / 7));
  const out: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // نمط شبه عشوائي ثابت لإضاءة النوافذ
      if ((r * 7 + c * 13 + i * 5) % 5 > 1) continue;
      out.push(
        <rect
          key={`${r}-${c}`}
          x={b.x + 4 + c * 7}
          y={HORIZON - b.h + 8 + r * 14}
          width={3}
          height={5}
          rx={0.6}
          className="ks-fill-window"
        />,
      );
    }
  }
  return out;
}

/** برج بكرة/كرتين — مستوحى من أبراج الكويت */
function Tower({
  x,
  height,
  spheres,
  p,
}: {
  x: number;
  height: number;
  spheres: { y: number; r: number }[];
  /** بادئة معرّفات SVG (تختلف لكل نسخة من الرسم في الصفحة) */
  p: string;
}) {
  const top = HORIZON - height;
  return (
    <g>
      {/* الإبرة: مخروط رفيع جدًا */}
      <path
        d={`M${x - 5} ${HORIZON} L${x - 1.2} ${top} L${x + 1.2} ${top} L${x + 5} ${HORIZON} Z`}
        fill={`url(#${p}-tower)`}
      />
      <line x1={x} y1={top - 18} x2={x} y2={top} className="ks-stroke-edge" strokeWidth={1.2} />
      {spheres.map((s, i) => (
        <g key={i}>
          <circle cx={x} cy={HORIZON - s.y} r={s.r} fill={`url(#${p}-sphere)`} />
          {/* الأقراص المميزة على كرات الأبراج */}
          <circle cx={x} cy={HORIZON - s.y} r={s.r - 2} fill={`url(#${p}-discs)`} opacity={0.85} />
          <circle
            cx={x}
            cy={HORIZON - s.y}
            r={s.r}
            fill="none"
            className="ks-stroke-edge"
            strokeWidth={1.4}
            filter={`url(#${p}-glow)`}
          />
        </g>
      ))}
      <line
        x1={x}
        y1={top}
        x2={x}
        y2={HORIZON}
        className="ks-stroke-edge"
        strokeWidth={0.8}
        opacity={0.6}
        filter={`url(#${p}-glow)`}
      />
    </g>
  );
}

export function KuwaitSkyline({ className, idPrefix = "ks" }: { className?: string; idPrefix?: string }) {
  const p = idPrefix;
  const scene = (
    <>
      {buildings.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={HORIZON - b.h} width={b.w} height={b.h} fill={`url(#${p}-building)`} />
          {windows(b, i)}
        </g>
      ))}
      <Tower
        x={170}
        height={300}
        spheres={[
          { y: 170, r: 30 },
          { y: 232, r: 18 },
        ]}
        p={p}
      />
      <Tower x={236} height={232} spheres={[{ y: 150, r: 24 }]} p={p} />
      <Tower x={140} height={176} spheres={[]} p={p} />
    </>
  );

  return (
    <svg
      viewBox="0 0 600 520"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
      className={cn("pointer-events-none select-none", className)}
    >
      <defs>
        <linearGradient id={`${p}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="ks-stop-top" stopOpacity="0" />
          <stop offset="0.45" className="ks-stop-mid" stopOpacity="0.85" />
          <stop offset="0.73" className="ks-stop-horizon" />
          <stop offset="1" className="ks-stop-water" />
        </linearGradient>
        <radialGradient id={`${p}-sun`} cx="0.32" cy="0.72" r="0.45">
          <stop offset="0" className="ks-stop-sun" stopOpacity="0.95" />
          <stop offset="1" className="ks-stop-sun" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${p}-building`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="ks-stop-building-top" />
          <stop offset="1" className="ks-stop-building" />
        </linearGradient>
        <linearGradient id={`${p}-tower`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" className="ks-stop-building" />
          <stop offset="0.5" className="ks-stop-tower-light" />
          <stop offset="1" className="ks-stop-building" />
        </linearGradient>
        <radialGradient id={`${p}-sphere`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" className="ks-stop-sphere-light" />
          <stop offset="1" className="ks-stop-sphere" />
        </radialGradient>
        <pattern id={`${p}-discs`} width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="1.6" className="ks-fill-disc" />
        </pattern>
        <filter id={`${p}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id={`${p}-reflect`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="white" stopOpacity="0.55" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <mask id={`${p}-reflect-mask`}>
          <rect x="0" y={HORIZON} width="600" height={520 - HORIZON} fill={`url(#${p}-reflect)`} />
        </mask>
      </defs>

      <rect width="600" height="520" fill={`url(#${p}-sky)`} />
      <ellipse cx="190" cy={HORIZON - 10} rx="260" ry="150" fill={`url(#${p}-sun)`} />

      {scene}

      {/* الانعكاس على الماء */}
      <g mask={`url(#${p}-reflect-mask)`} opacity={0.6}>
        <g transform={`translate(0 ${HORIZON * 2}) scale(1 -1)`}>{scene}</g>
      </g>
      {/* خطوط لمعان على سطح الماء */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect
          key={i}
          x={40 + ((i * 97) % 420)}
          y={HORIZON + 12 + i * 18}
          width={120 - i * 12}
          height={1.4}
          rx={1}
          className="ks-fill-edge"
          opacity={0.35 - i * 0.04}
        />
      ))}
      <rect
        x="0"
        y={HORIZON}
        width="600"
        height="1.5"
        className="ks-fill-edge"
        opacity="0.7"
        filter={`url(#${p}-glow)`}
      />
    </svg>
  );
}
