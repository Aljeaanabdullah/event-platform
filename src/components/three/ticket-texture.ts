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
 * نستخدم Canvas لأن المتصفح يتولى تشكيل الحروف العربية واتجاهها بشكل صحيح
 * وبنفس خطوط الموقع، دون تحميل ملفات خطوط إضافية للمشهد ثلاثي الأبعاد.
 */
export function createTicketTexture(labels: TicketLabels, fontFamily: string, maxAnisotropy: number) {
  const W = 1600;
  const H = Math.round((W * TICKET.height) / TICKET.width);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const rtl = labels.dir === "rtl";
  // موضع خط القطع بالبكسل (يطابق الشكل الهندسي)
  const stubU = 0.5 + (TICKET.stubOffset / 2) * (rtl ? -1 : 1);
  const stubX = stubU * W;

  // الخلفية: تدرج بنفسجي → أزرق كهربائي
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#5b21b6");
  bg.addColorStop(0.55, "#6d28d9");
  bg.addColorStop(1, "#2563eb");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // توهج ناعم
  const glow = ctx.createRadialGradient(W * 0.3, H * 0.2, 0, W * 0.3, H * 0.2, W * 0.6);
  glow.addColorStop(0, "rgba(255,255,255,0.28)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // شبكة خفيفة
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 2;
  for (let x = 0; x < W; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // خط القطع المنقّط
  ctx.setLineDash([18, 16]);
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(stubX, 60);
  ctx.lineTo(stubX, H - 60);
  ctx.stroke();
  ctx.setLineDash([]);

  // منطقة النص الرئيسية (الجزء الأكبر من التذكرة)
  const pad = 110;
  const mainStart = rtl ? W - pad : pad;
  ctx.direction = labels.dir;
  ctx.textAlign = "start";
  ctx.fillStyle = "#ffffff";

  ctx.globalAlpha = 0.8;
  ctx.font = `600 52px ${fontFamily}`;
  ctx.fillText(labels.brand.toUpperCase(), mainStart, 170);

  ctx.globalAlpha = 1;
  ctx.font = `700 150px ${fontFamily}`;
  ctx.fillText(labels.title, mainStart, H / 2 + 60);

  ctx.globalAlpha = 0.85;
  ctx.font = `500 56px ${fontFamily}`;
  ctx.fillText(labels.subtitle, mainStart, H - 140);
  ctx.globalAlpha = 1;

  // نمط زخرفي يشبه رمز QR داخل الجزء القابل للقطع (ليس رمزًا حقيقيًا)
  const stubCenter = rtl ? stubX / 2 : stubX + (W - stubX) / 2;
  const cell = 26;
  const grid = 9;
  const size = cell * grid;
  const ox = stubCenter - size / 2;
  const oy = H / 2 - size / 2;
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.beginPath();
  ctx.roundRect(ox - 28, oy - 28, size + 56, size + 56, 28);
  ctx.fill();
  ctx.fillStyle = "#1e1b4b";
  let seed = 7;
  const rand = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  for (let gy = 0; gy < grid; gy++) {
    for (let gx = 0; gx < grid; gx++) {
      const corner = (gx < 3 && gy < 3) || (gx > 5 && gy < 3) || (gx < 3 && gy > 5);
      const ring = corner && !(gx % 6 === 1 && gy % 6 === 1);
      if (corner ? ring : rand() > 0.5) ctx.fillRect(ox + gx * cell, oy + gy * cell, cell - 2, cell - 2);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, maxAnisotropy);
  texture.needsUpdate = true;
  return texture;
}
