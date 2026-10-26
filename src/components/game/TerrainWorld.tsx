"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { ChunkManager } from "@/render/voxel/ChunkManager";
import type { VoxelMaterials } from "@/render/materials/voxelMaterial";
import { debugStats } from "@/render/debugStats";

interface TerrainWorldProps {
  seed: number;
  materials: VoxelMaterials;
  shadows: boolean;
  radius?: number;
  /** Focus point for chunk streaming (world x/z). */
  focus?: [number, number];
  onFirstChunks?: () => void;
}

/** Streams voxel terrain chunks (generated + meshed in workers) around a focus point. */
export function TerrainWorld({
  seed,
  materials,
  shadows,
  radius = 4,
  focus = [0, 0],
  onFirstChunks,
}: TerrainWorldProps) {
  const manager = useMemo(
    () => new ChunkManager(seed, materials, radius),
    [seed, materials, radius],
  );

  const notified = useRef(false);

  useEffect(() => () => manager.dispose(), [manager]);
  useEffect(() => manager.setShadows(shadows), [manager, shadows]);

  useFrame(() => {
    manager.update(focus[0], focus[1]);
    debugStats.chunks = manager.chunkCount;
    if (!notified.current && manager.isIdle) {
      notified.current = true;
      onFirstChunks?.();
    }
  });

  return <primitive object={manager.group} />;
}
