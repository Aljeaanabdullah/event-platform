import * as THREE from "three";

import { TICKET } from "./ticket-geometry";

export type TicketLabels = {
  brand: string;
  title: string;
  subtitle: string;
  dir: "rtl" | "ltr";
};

/**
 * يرسم وجه التذكرة على Canvas ثنائي الأبعاد ثم يحوّله إلى خامة.
 * Canvas يتولى تشكيل الحروف العربية واتجاهها بخطوط الموقع نفسها، دون تحميل خطوط إضافية للمشهد.
 * التصميم: زجاج بنفسجي داكن، شعار واسم المنصة، كبسولة "تذكرة دخول"، وباركود على الجزء القابل للقطع.
 */
export function createTicketTexture(labels: TicketLabels, fontFamily: string, maxAnisotropy: number) {
  const W = 2048;
  const H = Math.round((W * TICKET.height) / TICKET.width);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const rtl = labels.dir === "rtl";
  const stubX = (0.5 + (TICKET.stubOffset / 2) * (rtl ? -1 : 1)) * W;

  // ===== الخلفية: زجاج بنفسجي بتدرج عميق =====
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#2a1065");
  bg.addColorStop(0.45, "#4c1d95");
  bg.addColorStop(0.75, "#6d28d9");
  bg.addColorStop(1, "#3b1a8f");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // انعكاسات ضوئية مائلة (إحساس الزجاج)
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (const [x, w, a] of [
    [0.18, 0.22, 0.16],
    [0.46, 0.08, 0.1],
    [0.7, 0.16, 0.12],
  ] as const) {
    const g = ctx.createLinearGradient(W * x, 0, W * (x + w), H);
    g.addColorStop(0, `rgba(255,255,255,0)`);
    g.addColorStop(0.5, `rgba(236,210,255,${a})`);
    g.addColorStop(1, `rgba(255,255,255,0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(W * x, 0);
    ctx.lineTo(W * (x + w), 0);
    ctx.lineTo(W * (x + w - 0.12), H);
    ctx.lineTo(W * (x - 0.12), H);
    ctx.closePath();
    ctx.fill();
  }
  // توهج وردي في الزاوية
  const glow = ctx.createRadialGradient(
    W * (rtl ? 0.25 : 0.75),
    H * 0.15,
    0,
    W * (rtl ? 0.25 : 0.75),
    H * 0.15,
    W * 0.55,
  );
  glow.addColorStop(0, "rgba(236,72,153,0.35)");
  glow.addColorStop(1, "rgba(236,72,153,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // إطار داخلي مضيء
  ctx.strokeStyle = "rgba(216,180,254,0.45)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(28, 28, W - 56, H - 56, 60);
  ctx.stroke();

  // ===== خط القطع =====
  ctx.setLineDash([22, 18]);
  ctx.strokeStyle = "rgba(233,213,255,0.6)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(stubX, 90);
  ctx.lineTo(stubX, H - 90);
  ctx.stroke();
  ctx.setLineDash([]);

  // ===== المنطقة الرئيسية =====
  const mainCenter = rtl ? stubX + (W - stubX) / 2 : stubX / 2;
  const mainWidth = rtl ? W - stubX : stubX;

  // الشعار (شريطان منحنيان) + اسم المنصة
  const logoSize = 120;
  ctx.font = `700 96px ${fontFamily}`;
  ctx.direction = "ltr";
  const brand = labels.brand.replace(/\s+/g, "");
  const brandWidth = ctx.measureText(brand).width;
  const groupWidth = logoSize + 30 + brandWidth;
  const gx = mainCenter - groupWidth / 2;
  const gy = H * 0.3;
  drawLogo(ctx, gx, gy - logoSize / 2, logoSize);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(216,180,254,0.9)";
  ctx.shadowBlur = 24;
  ctx.fillText(brand, gx + logoSize + 30, gy + 6);
  ctx.shadowBlur = 0;

  // كبسولة "تذكرة دخول"
  ctx.direction = labels.dir;
  ctx.font = `700 78px ${fontFamily}`;
  const pillText = labels.title;
  const pillW = Math.min(mainWidth * 0.75, ctx.measureText(pillText).width + 140);
  const pillH = 132;
  const px = mainCenter - pillW / 2;
  const py = H * 0.56;
  const pill = ctx.createLinearGradient(px, 0, px + pillW, 0);
  pill.addColorStop(0, "#7c3aed");
  pill.addColorStop(1, "#db2777");
  ctx.fillStyle = pill;
  ctx.shadowColor = "rgba(236,72,153,0.7)";
  ctx.shadowBlur = 40;
  ctx.beginPath();
  ctx.roundRect(px, py, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText(pillText, mainCenter, py + pillH / 2 + 4);

  // سطر فرعي
  ctx.globalAlpha = 0.8;
  ctx.font = `500 56px ${fontFamily}`;
  ctx.fillText(labels.subtitle, mainCenter, H * 0.86);
  ctx.globalAlpha = 1;

  // ===== الجزء القابل للقطع: باركود عمودي + رقم تسلسلي =====
  const stubCenter = rtl ? stubX / 2 : stubX + (W - stubX) / 2;
  const bw = 230;
  const bh = H * 0.6;
  const bx = stubCenter - bw / 2;
  const by = (H - bh) / 2;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.beginPath();
  ctx.roundRect(bx - 26, by - 26, bw + 52, bh + 52, 26);
  ctx.fill();
  ctx.fillStyle = "#1e1338";
  let seed = 11;
  const rand = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  for (let y = by; y < by + bh;) {
    const h = 4 + Math.floor(rand() * 4) * 4;
    if (rand() > 0.35) ctx.fillRect(bx, y, bw, h);
    y += h + 4 + Math.floor(rand() * 3) * 3;
  }
  ctx.save();
  ctx.translate(stubCenter + bw / 2 + 70, H / 2);
  ctx.rotate(rtl ? -Math.PI / 2 : Math.PI / 2);
  ctx.direction = "ltr";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(233,213,255,0.8)";
  ctx.font = `600 40px ui-monospace, monospace`;
  ctx.fillText("EP-2026 · 00042", 0, 0);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, maxAnisotropy);
  texture.needsUpdate = true;
  return texture;
}

/** شعار المنصة (نفس شكل LogoMark) مرسومًا على Canvas */
function drawLogo(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const s = size / 40;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const a = ctx.createLinearGradient(0, 0, 40, 40);
  a.addColorStop(0, "#c084fc");
  a.addColorStop(1, "#ec4899");
  ctx.fillStyle = a;
  ctx.fill(
    new Path2D(
      "M9 27c0-9.4 7.6-17 17-17h5a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-5c-5.5 0-10 4.5-10 10v2a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2v-2z",
    ),
  );
  const b = ctx.createLinearGradient(40, 0, 0, 40);
  b.addColorStop(0, "#818cf8");
  b.addColorStop(1, "#c084fc");
  ctx.fillStyle = b;
  ctx.fill(
    new Path2D(
      "M31 13c0 9.4-7.6 17-17 17H9a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h5c5.5 0 10-4.5 10-10v-2a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2z",
    ),
  );
  ctx.restore();
}
