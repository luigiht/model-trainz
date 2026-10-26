"use client";

import { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { PCFShadowMap } from "three";
import { useShallow } from "zustand/react/shallow";
import { resolveDpr, resolveEffects } from "@/render/effects/quality";
import { useActiveQualityLevel, useSettingsStore } from "@/game/state/settingsStore";
import { PostEffects } from "./PostEffects";
import { RenderProbe } from "./RenderProbe";
import { TerrainWorld } from "./TerrainWorld";
import { useVoxelMaterials } from "./useVoxelMaterials";
import { VoxelModelMesh } from "./VoxelModelMesh";
import { COTTAGE, LAMP_POST, SIGNAL } from "@/render/world/propModels";
import { TerrainGenerator } from "@/render/world/terrain";

const WORLD_SEED = 20261026;
const SUN_OFFSET: [number, number, number] = [30, 42, 18];
/** Surface height at the origin, so the M1 showcase props sit on the ground. */
const groundAt = (gen: TerrainGenerator, x: number, z: number) => gen.heightAt(x, z) + 1;

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
      camera={{ position: [70, 62, 70], fov: 28, near: 1, far: 600 }}
      aria-label="Rail Baron Clicker 3D view"
      role="img"
    >
      <color attach="background" args={["#a9cbe0"]} />
      <fog attach="fog" args={["#a9cbe0", 110, 260]} />
      <hemisphereLight args={["#cfe6ff", "#5d4a33", 0.9]} />
      <directionalLight
        position={SUN_OFFSET}
        intensity={2.6}
        color="#fff1d6"
        castShadow={effects.shadows}
        shadow-mapSize={[effects.shadowMapSize, effects.shadowMapSize]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-camera-near={1}
        shadow-camera-far={140}
      />
      <World shadows={effects.shadows} bevel={effects.bevel} onReady={onReady} />
      <OrbitControls
        target={[0, 14, 0]}
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

function World({
  shadows,
  bevel,
  onReady,
}: {
  shadows: boolean;
  bevel: number;
  onReady?: () => void;
}) {
  const materials = useVoxelMaterials(bevel);
  const gen = useMemo(() => new TerrainGenerator(WORLD_SEED), []);
  return (
    <>
      <TerrainWorld
        seed={WORLD_SEED}
        materials={materials}
        shadows={shadows}
        radius={5}
        onFirstChunks={onReady}
      />
      <VoxelModelMesh
        model={COTTAGE}
        materials={materials}
        shadows={shadows}
        position={[6, groundAt(gen, 6, -4), -4]}
      />
      <VoxelModelMesh
        model={LAMP_POST}
        materials={materials}
        shadows={shadows}
        position={[1.5, groundAt(gen, 1, 0), 0.5]}
      />
      <VoxelModelMesh
        model={SIGNAL}
        materials={materials}
        shadows={shadows}
        position={[-2.5, groundAt(gen, -3, 2), 2.5]}
      />
    </>
  );
}
