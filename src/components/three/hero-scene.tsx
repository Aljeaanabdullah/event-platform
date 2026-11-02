"use client";

import { Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { createTicketShape, normalizeShapeUVs, TICKET } from "./ticket-geometry";
import { createTicketTexture, type TicketLabels } from "./ticket-texture";

export type SceneQuality = "high" | "low";

type Props = {
  labels: TicketLabels;
  quality: SceneQuality;
  /** تتبّع مؤشر الماوس (يُعطّل على شاشات اللمس) */
  followPointer: boolean;
  /** إيقاف الرسم عند خروج المشهد من الشاشة لتوفير البطارية */
  active: boolean;
  onReady?: () => void;
};

/** موضع المؤشر على مستوى النافذة كاملة (‎-1..1)، وليس فوق اللوحة فقط */
function usePointer(enabled: boolean) {
  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    if (!enabled) return;
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [enabled]);
  return pointer;
}

function Ticket({ labels, quality, followPointer, onReady }: Omit<Props, "active">) {
  const group = useRef<THREE.Group>(null);
  const pointer = usePointer(followPointer);
  const gl = useThree((s) => s.gl);
  const stubSide = labels.dir === "rtl" ? -1 : 1;

  const { body, face } = useMemo(() => {
    const { shape } = createTicketShape(stubSide);
    const curveSegments = quality === "high" ? 32 : 12;
    const body = new THREE.ExtrudeGeometry(shape, {
      depth: TICKET.depth,
      bevelEnabled: true,
      bevelThickness: TICKET.bevel,
      bevelSize: TICKET.bevel,
      bevelSegments: quality === "high" ? 4 : 1,
      curveSegments,
    });
    body.translate(0, 0, -TICKET.depth / 2);
    const face = normalizeShapeUVs(new THREE.ShapeGeometry(shape, curveSegments));
    return { body, face };
  }, [stubSide, quality]);

  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let cancelled = false;
    let tex: THREE.Texture | null = null;
    // ننتظر تحميل خطوط الموقع حتى يُرسم النص العربي والإنجليزي بالخط الصحيح
    document.fonts.ready.then(() => {
      if (cancelled) return;
      const family = getComputedStyle(document.body).fontFamily || "sans-serif";
      tex = createTicketTexture(labels, family, gl.capabilities.getMaxAnisotropy());
      setTexture(tex);
      // نُظهر المشهد فقط بعد اكتمال وجه التذكرة لتفادي ظهور مجسم بلا نص
      requestAnimationFrame(() => onReady?.());
    });
    return () => {
      cancelled = true;
      tex?.dispose();
    };
  }, [labels, gl, onReady]);

  useEffect(() => () => (body.dispose(), face.dispose()), [body, face]);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const px = followPointer ? pointer.current.x : Math.sin(t * 0.3) * 0.4;
    const py = followPointer ? pointer.current.y : 0;
    // دوران ناعم نحو المؤشر مع تخميد (damping) لتفادي الحركة المفاجئة
    // الميل الأساسي يتجه نحو منتصف الصفحة: عكسي بين RTL و LTR
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, -0.35 * stubSide + px * 0.45, 3, delta);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, 0.12 + py * 0.3, 3, delta);
    g.rotation.z = THREE.MathUtils.damp(g.rotation.z, -0.08 + px * 0.05, 3, delta);
    // طفو خفيف
    g.position.y = Math.sin(t * 0.9) * 0.06;
  });

  const faceZ = TICKET.depth / 2 + TICKET.bevel + 0.002;

  return (
    <group ref={group} rotation={[0.12, -0.35 * stubSide, -0.08]}>
      <mesh geometry={body} castShadow>
        <meshPhysicalMaterial
          color="#4c1d95"
          metalness={0.6}
          roughness={0.25}
          clearcoat={1}
          clearcoatRoughness={0.15}
          iridescence={quality === "high" ? 0.6 : 0}
          iridescenceIOR={1.4}
        />
      </mesh>
      {texture ? (
        <mesh geometry={face} position={[0, 0, faceZ]}>
          <meshPhysicalMaterial
            map={texture}
            roughness={0.55}
            metalness={0.1}
            clearcoat={0.35}
            clearcoatRoughness={0.4}
          />
        </mesh>
      ) : null}
    </group>
  );
}

export default function HeroScene({ labels, quality, followPointer, active, onReady }: Props) {
  const [dpr, setDpr] = useState<number>(quality === "high" ? 1.75 : 1);

  return (
    <Canvas
      dpr={dpr}
      frameloop={active ? "always" : "never"}
      camera={{ position: [0, 0, 6.2], fov: 32 }}
      gl={{ antialias: quality === "high", alpha: true, powerPreference: "high-performance" }}
      aria-hidden
      // المشهد زخرفي بالكامل، والنص الحقيقي موجود في الصفحة
      tabIndex={-1}
    >
      {/* يخفّض الدقة تلقائيًا إذا انخفض معدل الإطارات على الأجهزة الضعيفة */}
      <PerformanceMonitor onDecline={() => setDpr(1)} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 4, 5]} intensity={2.2} color="#ffffff" />
      <pointLight position={[-4, -2, 3]} intensity={18} color="#3b82f6" />
      <pointLight position={[4, 2, 2]} intensity={14} color="#8b5cf6" />
      {quality === "high" ? (
        // بيئة إضاءة مولّدة محليًا (بدون تحميل ملفات HDR من الإنترنت) لانعكاسات فاخرة
        <Environment resolution={128} frames={1}>
          <Lightformer intensity={3} position={[0, 4, 4]} scale={[8, 2, 1]} color="#ffffff" />
          <Lightformer intensity={4} position={[-5, 0, 2]} scale={[2, 6, 1]} color="#7c3aed" />
          <Lightformer intensity={4} position={[5, 0, 2]} scale={[2, 6, 1]} color="#2563eb" />
        </Environment>
      ) : null}
      <Ticket labels={labels} quality={quality} followPointer={followPointer} onReady={onReady} />
    </Canvas>
  );
}
