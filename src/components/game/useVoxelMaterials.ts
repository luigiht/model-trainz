"use client";

import { useEffect, useMemo } from "react";
import { createVoxelTextures } from "@/render/voxel/atlasTexture";
import {
  createVoxelMaterials,
  setVoxelBevel,
  type VoxelMaterials,
} from "@/render/materials/voxelMaterial";

/** Creates the voxel texture arrays + materials once per mount and disposes them on unmount. */
export function useVoxelMaterials(bevel: number): VoxelMaterials {
  const { textures, materials } = useMemo(() => {
    const textures = createVoxelTextures();
    return { textures, materials: createVoxelMaterials(textures) };
  }, []);

  useEffect(() => setVoxelBevel(materials, bevel), [materials, bevel]);

  useEffect(
    () => () => {
      for (const m of Object.values(materials)) m.dispose();
      textures.dispose();
    },
    [materials, textures],
  );
  return materials;
}
