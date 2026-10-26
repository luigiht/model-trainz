"use client";

import { useEffect, useMemo } from "react";
import type { ThreeElements } from "@react-three/fiber";
import { RENDER_CLASSES } from "@/render/voxel/blocks";
import { meshArraysToGeometry } from "@/render/voxel/geometry";
import { meshVoxelModel, type VoxelModelDef } from "@/render/voxel/VoxelModel";
import type { VoxelMaterials } from "@/render/materials/voxelMaterial";

type GroupProps = ThreeElements["group"];

/** Renders a layer-string voxel model with the shared voxel materials. */
export function VoxelModelMesh({
  model,
  materials,
  shadows = true,
  wireframe = false,
  ...groupProps
}: {
  model: VoxelModelDef;
  materials: VoxelMaterials;
  shadows?: boolean;
  wireframe?: boolean;
} & GroupProps) {
  const parts = useMemo(() => {
    const meshes = meshVoxelModel(model);
    return RENDER_CLASSES.flatMap((cls) => {
      const geometry = meshArraysToGeometry(meshes[cls]);
      return geometry ? [{ cls, geometry }] : [];
    });
  }, [model]);

  useEffect(() => () => parts.forEach((p) => p.geometry.dispose()), [parts]);

  return (
    <group {...groupProps} scale={model.scale}>
      {parts.map(({ cls, geometry }) => (
        <mesh
          key={cls}
          geometry={geometry}
          material={wireframe ? undefined : materials[cls]}
          castShadow={shadows && cls !== "transparent"}
          receiveShadow={shadows}
          renderOrder={cls === "transparent" ? 1 : 0}
        >
          {wireframe && <meshBasicMaterial wireframe color="#9fe870" />}
        </mesh>
      ))}
    </group>
  );
}
