import { TerrainField, buildTerrainChunk } from "@/render/world/terrain";
import type { ChunkRequest, ChunkResponse } from "./chunkProtocol";

let field: TerrainField | null = null;

/** Build one terrain chunk. Shared by the worker and the main-thread fallback. */
export function buildChunk(req: ChunkRequest): ChunkResponse {
  const t0 = performance.now();
  if (!field || field.seed !== req.seed) field = new TerrainField(req.seed);
  const data = buildTerrainChunk(field, req.cx, req.cz);
  return { id: req.id, cx: req.cx, cz: req.cz, data, ms: performance.now() - t0 };
}

export function chunkTransferables(res: ChunkResponse): ArrayBuffer[] {
  const d = res.data;
  return [d.positions.buffer, d.normals.buffer, d.colors.buffer] as ArrayBuffer[];
}
