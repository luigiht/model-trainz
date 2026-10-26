import type { ChunkRequest, ChunkResponse } from "./chunkProtocol";

type Pending = { resolve: (r: ChunkResponse) => void; reject: (e: unknown) => void };

/**
 * Small pool of chunk workers with a FIFO queue. Falls back to building on the main thread when
 * Workers are unavailable (or fail to start), so the game still renders — just with more jank.
 */
export class ChunkWorkerPool {
  private workers: Worker[] = [];
  private idle: Worker[] = [];
  private queue: { req: ChunkRequest; pending: Pending }[] = [];
  private inflight = new Map<number, Pending>();
  private disposed = false;

  constructor(size = ChunkWorkerPool.defaultSize()) {
    if (typeof Worker === "undefined") return;
    try {
      for (let i = 0; i < size; i++) {
        const w = new Worker(new URL("./chunk.worker.ts", import.meta.url), { type: "module" });
        w.onmessage = (e: MessageEvent<ChunkResponse>) => this.onResult(w, e.data);
        w.onerror = (e) => this.onError(w, e);
        this.workers.push(w);
        this.idle.push(w);
      }
    } catch {
      this.terminate();
    }
  }

  static defaultSize(): number {
    const cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4;
    return Math.max(1, Math.min(4, cores - 1));
  }

  get pending(): number {
    return this.queue.length + this.inflight.size;
  }

  request(req: ChunkRequest): Promise<ChunkResponse> {
    if (this.workers.length === 0) {
      return import("./buildChunk").then((m) => m.buildChunk(req));
    }
    return new Promise((resolve, reject) => {
      this.queue.push({ req, pending: { resolve, reject } });
      this.pump();
    });
  }

  /** Drop queued (not yet started) requests, e.g. chunks that scrolled out of range. */
  cancelQueued(keep: (req: ChunkRequest) => boolean) {
    this.queue = this.queue.filter((q) => {
      if (keep(q.req)) return true;
      q.pending.reject(new DOMException("cancelled", "AbortError"));
      return false;
    });
  }

  private pump() {
    while (this.idle.length && this.queue.length) {
      const w = this.idle.pop()!;
      const { req, pending } = this.queue.shift()!;
      this.inflight.set(req.id, pending);
      (w as Worker & { jobId?: number }).jobId = req.id;
      w.postMessage(req);
    }
  }

  private onResult(w: Worker, res: ChunkResponse) {
    const p = this.inflight.get(res.id);
    this.inflight.delete(res.id);
    if (!this.disposed) this.idle.push(w);
    p?.resolve(res);
    this.pump();
  }

  private onError(w: Worker, e: ErrorEvent) {
    const id = (w as Worker & { jobId?: number }).jobId;
    if (id !== undefined) {
      this.inflight.get(id)?.reject(e);
      this.inflight.delete(id);
    }
    if (!this.disposed) this.idle.push(w);
    this.pump();
  }

  terminate() {
    this.disposed = true;
    for (const w of this.workers) w.terminate();
    this.workers = [];
    this.idle = [];
    const err = new DOMException("pool terminated", "AbortError");
    for (const q of this.queue) q.pending.reject(err);
    for (const p of this.inflight.values()) p.reject(err);
    this.queue = [];
    this.inflight.clear();
  }
}
