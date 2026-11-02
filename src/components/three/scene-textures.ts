import * as THREE from "three";

/** خامة توهج دائرية ناعمة (أبيض → شفاف) تُلوَّن عبر لون المادة */
export function createRadialGlowTexture(size = 256) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.55)");
  g.addColorStop(0.6, "rgba(255,255,255,0.12)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * تدرج عمودي للشفافية (alphaMap) لأشعة الضوء: قوي في الأسفل ويتلاشى للأعلى.
 * alphaMap يقرأ القناة الخضراء، لذلك نرسم بالرمادي.
 */
export function createBeamAlphaTexture(fadeTop = true) {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  // UV.y = 1 في أعلى الأسطوانة = أعلى الخامة
  g.addColorStop(0, fadeTop ? "#000" : "#fff");
  g.addColorStop(0.55, "#444");
  g.addColorStop(1, fadeTop ? "#fff" : "#000");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 256);
  return new THREE.CanvasTexture(c);
}
