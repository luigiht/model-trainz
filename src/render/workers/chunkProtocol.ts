import type { TerrainChunkData } from "@/render/world/terrain";

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
  data: TerrainChunkData;
  /** Build time inside the worker (ms). */
  ms: number;
}
