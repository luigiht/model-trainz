"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MeshStandardMaterial, Vector3, type InstancedMesh } from "three";
import { Route, type RoutePoint } from "@/game/simulation/route";
import { PIECE_LENGTH } from "@/game/simulation/rules";
import { vividCss } from "@/render/palette";
import { CAB_EYE, buildCabInterior } from "@/render/train/cabInterior";
import { placeOnRoute } from "@/render/train/placement";
import { LOCO_LENGTH, buildLocomotive } from "@/render/train/trainModels";
import { TerrainChunkManager } from "@/render/world/TerrainChunkManager";
import {
  DROP_MS,
  SLEEPERS_PER_PIECE,
  commitTrackPieces,
  createTrackResources,
  dropHeight,
  writeTrackPiece,
  type TrackMeshes,
} from "@/render/world/trackPieces";

/** A seed and start point where the line bends toward the driver's side, so new track is in view. */
const SEED = 7;
const SKY = vividCss(0xa9d8ee);
const HEMI_SKY = vividCss(0xdcefff);
const HEMI_GROUND = vividCss(0x6b5a3e);

const START_S = 136;
/** Track laid ahead of the loco before it sets off, and how far short of the railhead it stops. */
const MAX_LEAD = 56;
const STOP_SHORT = 6;
const LAY_EVERY_MS = 150;
const PIECES_PER_LAY = 2;
const MAX_SPEED = 10;
const ACCEL = 3;
/** Pieces drawn: from just behind the loco to the railhead. */
const CAPACITY = Math.ceil((LOCO_LENGTH + 12 + MAX_LEAD) / PIECE_LENGTH) + PIECES_PER_LAY;

interface Lay {
  from: number;
  to: number;
  at: number;
}

const p: RoutePoint = { x: 0, y: 0, z: 0, dx: 1, dy: 0, dz: 0 };
const pA: RoutePoint = { x: 0, y: 0, z: 0, dx: 1, dy: 0, dz: 0 };
const pB: RoutePoint = { x: 0, y: 0, z: 0, dx: 1, dy: 0, dz: 0 };
const eye = new Vector3();
const lookAt = new Vector3();

/**
 * The game's loop seen from the footplate: track drops in ahead of the heritage engine, then it
 * rolls up to the railhead and the gang lays the next stretch. Reduced motion shows a still view.
 */
function CabRide({ reducedMotion, onReady }: { reducedMotion: boolean; onReady: () => void }) {
  const route = useMemo(() => new Route(SEED), []);
  const terrainMat = useMemo(
    () => new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }),
    [],
  );
  const terrain = useMemo(() => new TerrainChunkManager(SEED, terrainMat, 3), [terrainMat]);
  const loco = useMemo(() => buildLocomotive(), []);
  const cab = useMemo(() => buildCabInterior(), []);
  const track = useMemo(() => createTrackResources(), []);
  const ballast = useRef<InstancedMesh>(null);
  const sleepers = useRef<InstancedMesh>(null);
  const rails = useRef<InstancedMesh>(null);
  const meshes = useRef<TrackMeshes | null>(null);
  const sim = useRef({
    s: START_S,
    v: 0,
    laid: Math.ceil((START_S + (reducedMotion ? MAX_LEAD : 2)) / PIECE_LENGTH),
    lays: [] as Lay[],
    nextLay: 0,
    ready: false,
  });

  useEffect(() => {
    terrain.setShadows(false);
    loco.group.add(cab.group);
    return () => {
      terrain.dispose();
      terrainMat.dispose();
      loco.dispose();
      cab.dispose();
      Object.values(track).forEach((r) => r.dispose());
    };
  }, [terrain, terrainMat, loco, cab, track]);

  useFrame(({ camera, clock }, delta) => {
    const b = ballast.current,
      sl = sleepers.current,
      rl = rails.current;
    if (!b || !sl || !rl) return;
    const sm = sim.current;
    const dt = Math.min(delta, 0.1);
    const now = performance.now();
    const t = clock.elapsedTime;

    if (!reducedMotion) {
      const head = sm.laid * PIECE_LENGTH;
      const lastLay = sm.lays[sm.lays.length - 1];
      const settled = !lastLay || now - lastLay.at > DROP_MS * 1.5;
      if (sm.v === 0 && head - sm.s < MAX_LEAD) {
        if (now >= sm.nextLay) {
          sm.lays.push({ from: sm.laid, to: sm.laid + PIECES_PER_LAY, at: now });
          sm.laid += PIECES_PER_LAY;
          sm.nextLay = now + LAY_EVERY_MS;
        }
      } else if (settled) {
        // Roll up to the railhead, braking to a stop a little short of it.
        const remaining = head - STOP_SHORT - sm.s;
        if (remaining <= 0.02) sm.v = 0;
        else {
          sm.v = Math.min(sm.v + ACCEL * dt, MAX_SPEED, Math.sqrt(2 * ACCEL * remaining));
          sm.s += Math.min(sm.v * dt, remaining);
        }
      }
      while (sm.lays.length && now - sm.lays[0].at > DROP_MS * 2) sm.lays.shift();
    }

    // Track from just behind the engine up to the railhead.
    meshes.current ??= { ballast: b, sleepers: sl, rails: rl };
    const first = Math.max(0, Math.floor((sm.s - LOCO_LENGTH - 12) / PIECE_LENGTH));
    const end = Math.min(sm.laid, first + CAPACITY);
    let n = 0;
    for (let i = first; i < end; i++, n++) {
      let drop = 0;
      for (const r of sm.lays)
        if (i >= r.from && i < r.to) drop = dropHeight(now - r.at, i - r.from);
      route.pointAt(i * PIECE_LENGTH, pA);
      route.pointAt((i + 1) * PIECE_LENGTH, pB);
      writeTrackPiece(meshes.current, n, pA, pB, drop);
    }
    commitTrackPieces(meshes.current, n);

    // Engine, wheels and the footplate details.
    const moving = Math.min(1, sm.v / 3);
    placeOnRoute(
      route,
      loco.group,
      sm.s - LOCO_LENGTH / 2,
      1.6,
      Math.sin(t * 7.3) * 0.004 * moving,
    );
    for (const w of loco.wheels) w.mesh.rotation.y = -sm.s / w.radius;
    cab.fireMaterial.emissiveIntensity = 2.2 + Math.sin(t * 13) * 0.4 + Math.sin(t * 29) * 0.3;
    cab.speedNeedle.rotation.x = -((sm.v / MAX_SPEED) * 4.2 - 2.1);
    cab.regulator.rotation.z = sm.v > 0 ? -0.7 : 0.15;

    // Driver's eye, looking down the line (the same pose as the in-game cab camera).
    loco.group.updateMatrixWorld();
    eye.set(...CAB_EYE);
    if (!reducedMotion) eye.y += Math.sin(sm.s * 2.2) * 0.025 * moving;
    loco.group.localToWorld(eye);
    route.pointAt(sm.s + 40, p);
    lookAt.set(p.x, p.y - 1.5, p.z);
    camera.position.copy(eye);
    camera.lookAt(lookAt);

    route.pointAt(sm.s + 30, p);
    terrain.update(p.x, p.z);
    if (!sm.ready && terrain.hasInitialChunks) {
      sm.ready = true;
      onReady();
    }
  });

  return (
    <group>
      <primitive object={terrain.group} />
      <primitive object={loco.group} />
      <instancedMesh
        ref={ballast}
        args={[track.ballastGeo, track.ballastMat, CAPACITY]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={sleepers}
        args={[track.boxGeo, track.sleeperMat, CAPACITY * SLEEPERS_PER_PIECE]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={rails}
        args={[track.boxGeo, track.railMat, CAPACITY * 2]}
        frustumCulled={false}
      />
    </group>
  );
}

/** Loading-screen backdrop: a small, shadowless scene built from the game's own models. */
export default function LoadingScene({
  reducedMotion,
  onReady,
}: {
  reducedMotion: boolean;
  onReady: () => void;
}) {
  // Client-only module (dynamic import with ssr:false), so `window` is safe here.
  const [dpr] = useState(() => Math.min(window.devicePixelRatio || 1, 1.5));
  return (
    <Canvas
      className="!absolute inset-0"
      dpr={dpr}
      flat
      gl={{ antialias: true, powerPreference: "low-power" }}
      camera={{ fov: 62, near: 0.08, far: 220 }}
      aria-hidden
    >
      <color attach="background" args={[SKY]} />
      <fog attach="fog" args={[SKY, 45, 105]} />
      <hemisphereLight args={[HEMI_SKY, HEMI_GROUND, 1.1]} />
      <directionalLight position={[60, 90, 30]} intensity={2.7} color="#fff0d2" />
      <CabRide reducedMotion={reducedMotion} onReady={onReady} />
    </Canvas>
  );
}
