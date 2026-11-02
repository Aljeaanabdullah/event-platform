import * as THREE from "three";

/** أبعاد التذكرة بوحدات المشهد */
export const TICKET = {
  width: 3.2,
  height: 1.7,
  corner: 0.16,
  notch: 0.2,
  /** موضع خط فصل الجزء القابل للقطع، كنسبة من نصف العرض */
  stubOffset: 0.53,
  depth: 0.05,
  bevel: 0.025,
} as const;

/**
 * شكل التذكرة: مستطيل بزوايا دائرية وفتحتين نصف دائريتين عند خط القطع.
 * `stubSide` = 1 يضع الجزء القابل للقطع يمينًا (LTR)، و -1 يسارًا (RTL).
 */
export function createTicketShape(stubSide: 1 | -1) {
  const hw = TICKET.width / 2;
  const hh = TICKET.height / 2;
  const r = TICKET.corner;
  const n = TICKET.notch;
  const sx = hw * TICKET.stubOffset * stubSide;

  const s = new THREE.Shape();
  s.moveTo(-hw + r, -hh);
  s.lineTo(sx - n, -hh);
  s.absarc(sx, -hh, n, Math.PI, 0, true); // فتحة سفلية تتجه للداخل
  s.lineTo(hw - r, -hh);
  s.quadraticCurveTo(hw, -hh, hw, -hh + r);
  s.lineTo(hw, hh - r);
  s.quadraticCurveTo(hw, hh, hw - r, hh);
  s.lineTo(sx + n, hh);
  s.absarc(sx, hh, n, 0, Math.PI, true); // فتحة علوية تتجه للداخل
  s.lineTo(-hw + r, hh);
  s.quadraticCurveTo(-hw, hh, -hw, hh - r);
  s.lineTo(-hw, -hh + r);
  s.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  return { shape: s, stubX: sx };
}

/** يعيد ضبط إحداثيات UV لتغطي الشكل من 0 إلى 1 حتى تُرسم الخامة على الوجه كاملًا */
export function normalizeShapeUVs(geometry: THREE.BufferGeometry) {
  const pos = geometry.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) + TICKET.width / 2) / TICKET.width;
    uv[i * 2 + 1] = (pos.getY(i) + TICKET.height / 2) / TICKET.height;
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geometry;
}
