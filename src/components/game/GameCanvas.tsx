"use client";

import { useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PCFShadowMap, type DirectionalLight } from "three";
import { useShallow } from "zustand/react/shallow";
import { resolveDpr, resolveEffects } from "@/render/effects/quality";
import { useActiveQualityLevel, useSettingsStore } from "@/game/state/settingsStore";
import { game } from "@/game/state/game";
import { vividCss } from "@/render/palette";
import { CameraRig } from "./CameraRig";
import { GameDriver } from "./GameDriver";
import { PostEffects } from "./PostEffects";
import { RenderProbe } from "./RenderProbe";
import { Stations } from "./Stations";
import { Steam } from "./Steam";
import { Terrain } from "./Terrain";
import { Track } from "./Track";
import { Train } from "./Train";
import { Water } from "./Water";

const SKY = vividCss(0xa9d8ee);
const HEMI_SKY = vividCss(0xdcefff);
const HEMI_GROUND = vividCss(0x6b5a3e);

export default function GameCanvas({
  onReady,
  reducedMotion,
}: {
  onReady?: () => void;
  reducedMotion: boolean;
}) {
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
  const sun = useRef<DirectionalLight>(null);

  return (
    <Canvas
      className="!absolute inset-0"
      dpr={dpr}
      shadows={{ enabled: effects.shadows, type: PCFShadowMap }}
      flat
      gl={{ antialias: false, powerPreference: "high-performance", preserveDrawingBuffer: true }}
      camera={{ fov: 30, near: 1, far: 700 }}
      aria-label="Model Trainz: your train and the railway you are building"
      role="img"
    >
      <color attach="background" args={[SKY]} />
      <fog attach="fog" args={[SKY, 120, 330]} />
      <hemisphereLight args={[HEMI_SKY, HEMI_GROUND, 1.1]} />
      <directionalLight
        ref={sun}
        intensity={2.7}
        color="#fff0d2"
        castShadow={effects.shadows}
        shadow-mapSize={[effects.shadowMapSize, effects.shadowMapSize]}
        shadow-bias={-0.0005}
        shadow-normalBias={0.04}
        shadow-camera-left={-55}
        shadow-camera-right={55}
        shadow-camera-top={55}
        shadow-camera-bottom={-55}
        shadow-camera-near={1}
        shadow-camera-far={160}
      />
      <GameDriver />
      <Terrain seed={game.state.seed} shadows={effects.shadows} onReady={onReady} />
      <Water />
      <Track shadows={effects.shadows} />
      <Stations />
      <Train />
      <Steam reducedMotion={reducedMotion} />
      <CameraRig sun={sun} reducedMotion={reducedMotion} />
      <PostEffects effects={effects} />
      <RenderProbe quality={level} />
    </Canvas>
  );
}
