/// <reference lib="webworker" />
import { buildChunk, chunkTransferables } from "./buildChunk";
import type { ChunkRequest } from "./chunkProtocol";

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (e: MessageEvent<ChunkRequest>) => {
  const res = buildChunk(e.data);
  ctx.postMessage(res, chunkTransferables(res));
};
