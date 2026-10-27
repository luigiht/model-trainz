"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { InstancedMesh, Mesh } from "three";
import { game } from "@/game/state/game";
import { PIECE_LENGTH } from "@/game/simulation/rules";
import type { RoutePoint } from "@/game/simulation/route";
import { flatMaterial } from "@/render/lowpoly";
import {
  DROP_MS,
  SLEEPERS_PER_PIECE,
  commitTrackPieces,
  createTrackResources,
  dropHeight,
  orient,
  writeTrackPiece,
  type TrackMeshes,
} from "@/render/world/trackPieces";

/** Pieces drawn behind / ahead of the train (the rest of the line is off-screen). */
const BEHIND = 50;
const AHEAD = 170;
const WINDOW = BEHIND + AHEAD;

// Scratch objects (no per-frame allocation).
const pA: RoutePoint = { x: 0, y: 0, z: 0, dx: 1, dy: 0, dz: 0 };
const pB: RoutePoint = { x: 0, y: 0, z: 0, dx: 1, dy: 0, dz: 0 };

export function Track({ shadows }: { shadows: boolean }) {
  const ballast = useRef<InstancedMesh>(null);
  const sleepers = useRef<InstancedMesh>(null);
  const rails = useRef<InstancedMesh>(null);
  const ghost = useRef<Mesh>(null);
  const last = useRef({ first: -1, laid: -1 });
  const meshes = useRef<TrackMeshes | null>(null);

  const res = useMemo(
    () => ({
      ...createTrackResources(),
      ghostMat: flatMaterial(0xfff1c4, { emissive: 0xffd36b, emissiveIntensity: 0.6 }),
    }),
    [],
  );
  useEffect(() => {
    res.ghostMat.transparent = true;
    res.ghostMat.depthWrite = false;
    return () => Object.values(res).forEach((r) => r.dispose());
  }, [res]);

  useFrame(({ clock }) => {
    const b = ballast.current,
      sl = sleepers.current,
      rl = rails.current,
      gh = ghost.current;
    if (!b || !sl || !rl || !gh) return;
    const { state, route, recentLays } = game;
    const trainPiece = Math.floor(state.trainS / PIECE_LENGTH);
    const first = Math.max(0, trainPiece - BEHIND);
    const end = Math.min(state.laid, first + WINDOW);
    const now = performance.now();
    const animating = recentLays.some((r) => now - r.at < DROP_MS && r.to > first);
    const changed = first !== last.current.first || state.laid !== last.current.laid;

    if (changed || animating) {
      last.current = { first, laid: state.laid };
      meshes.current ??= { ballast: b, sleepers: sl, rails: rl };
      let n = 0;
      for (let i = first; i < end; i++, n++) {
        // Drop-in animation for freshly laid pieces.
        let drop = 0;
        for (const r of recentLays)
          if (i >= r.from && i < r.to) drop = dropHeight(now - r.at, i - r.from);
        const s0 = i * PIECE_LENGTH;
        route.pointAt(s0, pA);
        route.pointAt(s0 + PIECE_LENGTH, pB);
        writeTrackPiece(meshes.current, n, pA, pB, drop);
      }
      commitTrackPieces(meshes.current, n);
    }

    // Pulsing "next piece goes here" ghost at the railhead.
    const s0 = state.laid * PIECE_LENGTH;
    route.pointAt(s0, pA);
    route.pointAt(s0 + PIECE_LENGTH, pB);
    gh.position.set(
      (pA.x + pB.x) / 2,
      (pA.y + pB.y) / 2 + 0.05 + Math.sin(clock.elapsedTime * 4) * 0.08,
      (pA.z + pB.z) / 2,
    );
    gh.quaternion.copy(orient(pB.x - pA.x, pB.y - pA.y, pB.z - pA.z));
    res.ghostMat.opacity = 0.25 + 0.2 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 4));
  });

  return (
    <group>
      <instancedMesh
        ref={ballast}
        args={[res.ballastGeo, res.ballastMat, WINDOW]}
        receiveShadow={shadows}
        frustumCulled={false}
      />
      <instancedMesh
        ref={sleepers}
        args={[res.boxGeo, res.sleeperMat, WINDOW * SLEEPERS_PER_PIECE]}
        castShadow={shadows}
        receiveShadow={shadows}
        frustumCulled={false}
      />
      <instancedMesh
        ref={rails}
        args={[res.boxGeo, res.railMat, WINDOW * 2]}
        castShadow={shadows}
        frustumCulled={false}
      />
      <mesh
        ref={ghost}
        geometry={res.ballastGeo}
        material={res.ghostMat}
        scale={[PIECE_LENGTH, 0.5, 2.7]}
      />
    </group>
  );
}
