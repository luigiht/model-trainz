/// <reference lib="webworker" />
import { meshTransferables } from "@/render/voxel/ChunkMesher";
import { buildChunk } from "./buildChunk";
import type { ChunkRequest } from "./chunkProtocol";

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (e: MessageEvent<ChunkRequest>) => {
  const res = buildChunk(e.data);
  ctx.postMessage(res, meshTransferables(res.meshes));
};
