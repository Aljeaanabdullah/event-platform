"use client";

import { Environment, Lightformer, PerformanceMonitor, Sparkles } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { createBeamAlphaTexture, createRadialGlowTexture } from "./scene-textures";
import { createTicketShape, normalizeShapeUVs, TICKET } from "./ticket-geometry";
import { createTicketTexture, type TicketLabels } from "./ticket-texture";

export type SceneQuality = "high" | "low";
export type SceneTheme = "dark" | "light";

type Props = {
  labels: TicketLabels;
  quality: SceneQuality;
  theme: SceneTheme;
  /** تتبّع مؤشر الماوس (يُعطّل على شاشات اللمس) */
  followPointer: boolean;
  /** إيقاف الرسم عند خروج المشهد من الشاشة لتوفير البطارية */
  active: boolean;
  onReady?: () => void;
};

/** ألوان المشهد حسب الثيم: التوهج "الإضافي" يناسب الخلفية الداكنة، والفاتح يحتاج مزجًا عاديًا وشفافية أقل */
const palette = {
  dark: {
    violet: "#a855f7",
    pink: "#ec4899",
    blue: "#6366f1",
    glowOpacity: 0.85,
    blending: THREE.AdditiveBlending,
  },
  light: {
    violet: "#7c3aed",
    pink: "#db2777",
    blue: "#4f46e5",
    glowOpacity: 0.4,
    blending: THREE.NormalBlending,
  },
} as const;

/** موضع المؤشر على مستوى النافذة كاملة (‎-1..1) */
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

// ---------------------------------------------------------------------
// التذكرة
// ---------------------------------------------------------------------
function Ticket({
  labels,
  quality,
  theme,
  followPointer,
  glowTexture,
  onReady,
}: Omit<Props, "active"> & { glowTexture: THREE.Texture }) {
  const group = useRef<THREE.Group>(null);
  const pointer = usePointer(followPointer);
  const gl = useThree((s) => s.gl);
  const stubSide = labels.dir === "rtl" ? -1 : 1;
  const colors = palette[theme];

  const { body, face, edge } = useMemo(() => {
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
    // حافة متوهجة: نفس الشكل خلف التذكرة بحجم أكبر قليلًا
    const edge = new THREE.ShapeGeometry(shape, curveSegments);
    return { body, face, edge };
  }, [stubSide, quality]);

  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let cancelled = false;
    let tex: THREE.Texture | null = null;
    // ننتظر خطوط الموقع حتى يُرسم النص العربي والإنجليزي بالخط الصحيح
    document.fonts.ready.then(() => {
      if (cancelled) return;
      const family = getComputedStyle(document.body).fontFamily || "sans-serif";
      tex = createTicketTexture(labels, family, gl.capabilities.getMaxAnisotropy());
      setTexture(tex);
      requestAnimationFrame(() => onReady?.());
    });
    return () => {
      cancelled = true;
      tex?.dispose();
    };
  }, [labels, gl, onReady]);

  useEffect(() => () => (body.dispose(), face.dispose(), edge.dispose()), [body, face, edge]);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const px = followPointer ? pointer.current.x : Math.sin(t * 0.3) * 0.4;
    const py = followPointer ? pointer.current.y : 0;
    // دوران ناعم نحو المؤشر مع تخميد لتفادي الحركة المفاجئة
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, -0.42 * stubSide + px * 0.4, 3, delta);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -0.18 + py * 0.25, 3, delta);
    g.rotation.z = THREE.MathUtils.damp(g.rotation.z, 0.16 * stubSide + px * 0.05, 3, delta);
    // طفو خفيف فوق المنصة
    g.position.y = 0.45 + Math.sin(t * 0.9) * 0.08;
  });

  const faceZ = TICKET.depth / 2 + TICKET.bevel + 0.002;

  return (
    <group ref={group} position={[0, 0.45, 0]} rotation={[-0.18, -0.42 * stubSide, 0.16 * stubSide]}>
      {/* هالة ضوئية خلف التذكرة */}
      <mesh position={[0, 0, -0.35]} scale={[6.2, 4.2, 1]}>
        <planeGeometry />
        <meshBasicMaterial
          map={glowTexture}
          color={colors.violet}
          transparent
          opacity={colors.glowOpacity * 0.55}
          blending={colors.blending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh geometry={edge} position={[0, 0, -TICKET.depth]} scale={1.035}>
        <meshBasicMaterial color={colors.pink} transparent opacity={0.55} toneMapped={false} />
      </mesh>
      <mesh geometry={body}>
        <meshPhysicalMaterial
          color={theme === "dark" ? "#3b0f8a" : "#5b21b6"}
          metalness={0.55}
          roughness={0.22}
          clearcoat={1}
          clearcoatRoughness={0.12}
          iridescence={quality === "high" ? 0.8 : 0}
          iridescenceIOR={1.45}
          emissive={colors.violet}
          emissiveIntensity={0.18}
        />
      </mesh>
      {texture ? (
        <mesh geometry={face} position={[0, 0, faceZ]}>
          <meshPhysicalMaterial
            map={texture}
            emissiveMap={texture}
            emissive="#ffffff"
            emissiveIntensity={theme === "dark" ? 0.38 : 0.2}
            roughness={0.4}
            metalness={0.1}
            clearcoat={0.6}
            clearcoatRoughness={0.25}
          />
        </mesh>
      ) : null}
    </group>
  );
}

// ---------------------------------------------------------------------
// المنصة المتوهجة + الحلقات + شعاع الضوء
// ---------------------------------------------------------------------
function GlowMaterial({
  color,
  opacity,
  blending,
}: {
  color: string;
  opacity: number;
  blending: THREE.Blending;
}) {
  return (
    <meshBasicMaterial
      color={color}
      transparent
      opacity={opacity}
      blending={blending}
      depthWrite={false}
      toneMapped={false}
      side={THREE.DoubleSide}
    />
  );
}

function Stage({
  theme,
  quality,
  glowTexture,
}: {
  theme: SceneTheme;
  quality: SceneQuality;
  glowTexture: THREE.Texture;
}) {
  const colors = palette[theme];
  const beamAlpha = useMemo(() => createBeamAlphaTexture(true), []);
  const spotAlpha = useMemo(() => createBeamAlphaTexture(false), []);
  const floorRing1 = useRef<THREE.MeshBasicMaterial>(null);
  const floorRing2 = useRef<THREE.MeshBasicMaterial>(null);
  const orbit = useRef<THREE.Mesh>(null);
  const seg = quality === "high" ? 96 : 48;

  useEffect(() => () => (beamAlpha.dispose(), spotAlpha.dispose()), [beamAlpha, spotAlpha]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    // نبض هادئ لحلقات الأرضية
    if (floorRing1.current)
      floorRing1.current.opacity = colors.glowOpacity * (0.55 + Math.sin(t * 1.6) * 0.2);
    if (floorRing2.current)
      floorRing2.current.opacity = colors.glowOpacity * (0.35 + Math.sin(t * 1.6 + 1.4) * 0.15);
    if (orbit.current) orbit.current.rotation.z += delta * 0.18;
  });

  return (
    <group>
      {/* حلقة مدارية مائلة حول التذكرة */}
      <mesh ref={orbit} position={[0, 0.35, 0]} rotation={[1.2, 0.25, 0]}>
        <torusGeometry args={[2.55, 0.018, 8, seg * 2, Math.PI * 1.7]} />
        <GlowMaterial color={colors.pink} opacity={colors.glowOpacity} blending={colors.blending} />
      </mesh>

      <group position={[0, -1.55, 0]}>
        {/* جسم المنصة */}
        <mesh>
          <cylinderGeometry args={[1.85, 2.0, 0.26, seg]} />
          <meshStandardMaterial
            color={theme === "dark" ? "#160b33" : "#2e1065"}
            metalness={0.85}
            roughness={0.28}
          />
        </mesh>
        <mesh position={[0, 0.14, 0]}>
          <cylinderGeometry args={[1.7, 1.7, 0.03, seg]} />
          <meshStandardMaterial
            color={theme === "dark" ? "#24104f" : "#4c1d95"}
            metalness={0.6}
            roughness={0.2}
            emissive={colors.violet}
            emissiveIntensity={0.35}
          />
        </mesh>
        {/* حواف نيون */}
        <mesh position={[0, 0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.72, 0.022, 8, seg]} />
          <GlowMaterial color={colors.violet} opacity={1} blending={colors.blending} />
        </mesh>
        <mesh position={[0, -0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.0, 0.018, 8, seg]} />
          <GlowMaterial color={colors.blue} opacity={0.9} blending={colors.blending} />
        </mesh>
        <mesh position={[0, 0.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.05, 1.1, seg]} />
          <GlowMaterial color={colors.pink} opacity={0.8} blending={colors.blending} />
        </mesh>

        {/* حلقات الأرضية النابضة */}
        <mesh position={[0, -0.14, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.35, 2.42, seg]} />
          <meshBasicMaterial
            ref={floorRing1}
            color={colors.violet}
            transparent
            blending={colors.blending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0, -0.14, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.95, 3.0, seg]} />
          <meshBasicMaterial
            ref={floorRing2}
            color={colors.blue}
            transparent
            blending={colors.blending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        {/* بقعة ضوء على الأرض */}
        <mesh position={[0, -0.15, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[6.5, 6.5, 1]}>
          <planeGeometry />
          <meshBasicMaterial
            map={glowTexture}
            color={colors.violet}
            transparent
            opacity={colors.glowOpacity * 0.7}
            blending={colors.blending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>

        {/* شعاع ضوء صاعد من المنصة */}
        <mesh position={[0, 1.4, 0]}>
          <cylinderGeometry args={[1.25, 1.7, 2.6, seg, 1, true]} />
          <meshBasicMaterial
            color={colors.violet}
            alphaMap={beamAlpha}
            transparent
            opacity={colors.glowOpacity * 0.32}
            blending={colors.blending}
            depthWrite={false}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* أضواء مسرح من الأعلى (للجودة العالية فقط) */}
      {quality === "high"
        ? [-1, 1].map((side) => (
            <mesh key={side} position={[side * 2.6, 2.6, -1.2]} rotation={[0, 0, side * 0.42]}>
              <cylinderGeometry args={[0.04, 0.9, 5.5, 32, 1, true]} />
              <meshBasicMaterial
                color={side < 0 ? colors.blue : colors.violet}
                alphaMap={spotAlpha}
                transparent
                opacity={colors.glowOpacity * 0.12}
                blending={colors.blending}
                depthWrite={false}
                toneMapped={false}
                side={THREE.DoubleSide}
              />
            </mesh>
          ))
        : null}
    </group>
  );
}

export default function HeroScene({ labels, quality, theme, followPointer, active, onReady }: Props) {
  const [dpr, setDpr] = useState<number>(quality === "high" ? 1.75 : 1);
  const glowTexture = useMemo(() => createRadialGlowTexture(), []);
  useEffect(() => () => glowTexture.dispose(), [glowTexture]);
  const colors = palette[theme];

  return (
    <Canvas
      dpr={dpr}
      frameloop={active ? "always" : "never"}
      camera={{ position: [0, 0.35, 8.4], fov: 32 }}
      gl={{ antialias: quality === "high", alpha: true, powerPreference: "high-performance" }}
      aria-hidden
      tabIndex={-1}
    >
      {/* يخفّض الدقة تلقائيًا إذا انخفض معدل الإطارات على الأجهزة الضعيفة */}
      <PerformanceMonitor onDecline={() => setDpr(1)} />
      <ambientLight intensity={theme === "dark" ? 0.45 : 0.8} />
      <directionalLight position={[3, 4, 5]} intensity={2} />
      <pointLight position={[-4, -1, 3]} intensity={20} color={colors.blue} />
      <pointLight position={[4, 2, 2]} intensity={16} color={colors.pink} />
      <pointLight position={[0, -1.2, 1.5]} intensity={8} color={colors.violet} />
      {quality === "high" ? (
        // بيئة إضاءة مولّدة محليًا (بلا تحميل ملفات HDR) لانعكاسات فاخرة
        <Environment resolution={128} frames={1}>
          <Lightformer intensity={3} position={[0, 4, 4]} scale={[8, 2, 1]} color="#ffffff" />
          <Lightformer intensity={4} position={[-5, 0, 2]} scale={[2, 6, 1]} color="#7c3aed" />
          <Lightformer intensity={4} position={[5, 0, 2]} scale={[2, 6, 1]} color="#db2777" />
        </Environment>
      ) : null}
      <Stage theme={theme} quality={quality} glowTexture={glowTexture} />
      <Ticket
        labels={labels}
        quality={quality}
        theme={theme}
        followPointer={followPointer}
        glowTexture={glowTexture}
        onReady={onReady}
      />
      {quality === "high" ? (
        <Sparkles count={45} scale={[7, 4.5, 3]} size={2.6} speed={0.35} opacity={0.75} color="#d8b4fe" />
      ) : null}
    </Canvas>
  );
}
