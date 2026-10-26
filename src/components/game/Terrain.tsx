"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshStandardMaterial } from "three";
import { game } from "@/game/state/game";
import type { RoutePoint } from "@/game/simulation/route";
import { TerrainChunkManager } from "@/render/world/TerrainChunkManager";
import { debugStats } from "@/render/debugStats";

const focus: RoutePoint = { x: 0, y: 0, z: 0, dx: 1, dy: 0, dz: 0 };

/** Streams low-poly terrain chunks (built in workers) around the train. */
export function Terrain({
  seed,
  shadows,
  onReady,
}: {
  seed: number;
  shadows: boolean;
  onReady?: () => void;
}) {
  const material = useMemo(
    () => new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }),
    [],
  );
  const manager = useMemo(() => new TerrainChunkManager(seed, material, 5), [seed, material]);
  const notified = useRef(false);

  useEffect(
    () => () => {
      manager.dispose();
      material.dispose();
    },
    [manager, material],
  );
  useEffect(() => manager.setShadows(shadows), [manager, shadows]);

  useFrame(() => {
    // Stream around a point a little ahead of the train, where the player is looking.
    game.route.pointAt(game.state.trainS + 20, focus);
    manager.update(focus.x, focus.z);
    debugStats.chunks = manager.chunkCount;
    if (!notified.current && manager.hasInitialChunks) {
      notified.current = true;
      onReady?.();
    }
  });

  return <primitive object={manager.group} />;
}
