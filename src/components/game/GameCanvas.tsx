"use client";

import { Suspense, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { PCFShadowMap } from "three";
import { useShallow } from "zustand/react/shallow";
import { resolveDpr, resolveEffects } from "@/render/effects/quality";
import { useActiveQualityLevel, useSettingsStore } from "@/game/state/settingsStore";
import { PostEffects } from "./PostEffects";
import { RenderProbe } from "./RenderProbe";
import { VoxelTestScene } from "./VoxelTestScene";

const SUN_POSITION: [number, number, number] = [18, 26, 12];

export default function GameCanvas({ onReady }: { onReady?: () => void }) {
  const level = useActiveQualityLevel();
  const toggles = useSettingsStore(
    useShallow((s) => ({
      shadows: s.shadows,
      ssao: s.ssao,
      bloom: s.bloom,
      tiltShift: s.tiltShift,
      resolutionScale: s.resolutionScale,
    })),
  );
  const effects = useMemo(() => resolveEffects(level, toggles), [level, toggles]);
  // Client-only module (dynamic import with ssr:false), so `window` is safe here.
  const [deviceDpr] = useState(() => window.devicePixelRatio || 1);
  const dpr = resolveDpr(level, toggles.resolutionScale, deviceDpr);

  return (
    <Canvas
      className="!absolute inset-0"
      dpr={dpr}
      shadows={{ enabled: effects.shadows, type: PCFShadowMap }}
      flat
      gl={{ antialias: false, powerPreference: "high-performance", preserveDrawingBuffer: true }}
      camera={{ position: [26, 22, 26], fov: 28, near: 0.5, far: 400 }}
      onCreated={() => onReady?.()}
      aria-label="Rail Baron Clicker 3D view"
      role="img"
    >
      <color attach="background" args={["#a9cbe0"]} />
      <fog attach="fog" args={["#a9cbe0", 60, 160]} />
      <hemisphereLight args={["#cfe6ff", "#5d4a33", 0.9]} />
      <directionalLight
        position={SUN_POSITION}
        intensity={2.6}
        color="#fff1d6"
        castShadow={effects.shadows}
        shadow-mapSize={[effects.shadowMapSize, effects.shadowMapSize]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-camera-near={1}
        shadow-camera-far={80}
      />
      <Suspense fallback={null}>
        <VoxelTestScene shadows={effects.shadows} />
      </Suspense>
      <OrbitControls
        target={[0, 2, 0]}
        enableDamping
        maxPolarAngle={Math.PI * 0.45}
        minDistance={12}
        maxDistance={90}
      />
      <PostEffects effects={effects} />
      <RenderProbe quality={level} />
    </Canvas>
  );
}
