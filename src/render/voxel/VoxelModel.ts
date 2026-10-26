/**
 * Compact, human-editable voxel model format: a palette of single characters → block names, and
 * horizontal layers (bottom → top), each a list of rows (z, back → front) of characters (x, left →
 * right). `.` or space is air. Parsed into a padded VoxelVolume and meshed by the same greedy mesher
 * as terrain; `scale` lets detailed models use a sub-voxel grid (e.g. 0.25).
 */
import { B, type BlockName } from "./blocks";
import { meshVolume, type ChunkMeshes } from "./ChunkMesher";
import { createVolume, setBlock, type VoxelVolume } from "./VoxelVolume";

export interface VoxelModelDef {
  name: string;
  /** World units per voxel. */
  scale: number;
  palette: Record<string, BlockName>;
  /** layers[y][z] is a string whose characters are x. */
  layers: string[][];
}

export interface ParsedModel {
  volume: VoxelVolume;
  /** Model size in world units. */
  size: [number, number, number];
}

export function parseVoxelModel(def: VoxelModelDef): ParsedModel {
  const sy = def.layers.length;
  const sz = Math.max(...def.layers.map((l) => l.length));
  const sx = Math.max(...def.layers.flatMap((l) => l.map((r) => r.length)));
  // Centre on x/z, sit on y = 0, so the model's local origin is its footprint centre.
  const volume = createVolume(sx, sy, sz, -sx / 2, 0, -sz / 2);
  def.layers.forEach((layer, y) =>
    layer.forEach((row, z) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === "." || ch === " ") continue;
        const name = def.palette[ch];
        if (!name) throw new Error(`Model "${def.name}": unknown palette char "${ch}"`);
        setBlock(volume, x, y, z, B[name]);
      }
    }),
  );
  return { volume, size: [sx * def.scale, sy * def.scale, sz * def.scale] };
}

export function meshVoxelModel(def: VoxelModelDef): ChunkMeshes {
  return meshVolume(parseVoxelModel(def).volume);
}
