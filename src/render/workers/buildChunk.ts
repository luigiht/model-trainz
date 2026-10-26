import { meshVolume } from "@/render/voxel/ChunkMesher";
import { TerrainGenerator } from "@/render/world/terrain";
import type { ChunkRequest, ChunkResponse } from "./chunkProtocol";

let generator: TerrainGenerator | null = null;

/** Generate + mesh one chunk. Shared by the worker and the synchronous fallback. */
export function buildChunk(req: ChunkRequest): ChunkResponse {
  const t0 = performance.now();
  if (!generator || generator.seed !== req.seed) generator = new TerrainGenerator(req.seed);
  const volume = generator.generateChunk(req.cx, req.cz);
  const meshes = meshVolume(volume);
  return { id: req.id, cx: req.cx, cz: req.cz, meshes, ms: performance.now() - t0 };
}
