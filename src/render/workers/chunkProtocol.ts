import type { ChunkMeshes } from "@/render/voxel/ChunkMesher";

export interface ChunkRequest {
  id: number;
  cx: number;
  cz: number;
  seed: number;
}

export interface ChunkResponse {
  id: number;
  cx: number;
  cz: number;
  meshes: ChunkMeshes;
  /** Generation + meshing time inside the worker (ms). */
  ms: number;
}
