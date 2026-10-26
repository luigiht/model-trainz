import { BufferAttribute, BufferGeometry, Group, Mesh, type Material } from "three";
import { ChunkWorkerPool } from "@/render/workers/ChunkWorkerPool";
import type { ChunkResponse } from "@/render/workers/chunkProtocol";
import { CHUNK_SIZE } from "./terrain";

const key = (cx: number, cz: number) => `${cx},${cz}`;

/**
 * Streams low-poly terrain chunks around a focus point: requests missing chunks from the worker
 * pool (nearest first), uploads at most `uploadsPerFrame` per frame, disposes chunks that leave the
 * radius. Owns geometries; the shared material is owned by the caller.
 */
export class TerrainChunkManager {
  readonly group = new Group();
  private loaded = new Map<string, Mesh>();
  private requested = new Set<string>();
  private ready: ChunkResponse[] = [];
  private pool = new ChunkWorkerPool();
  private wanted = new Set<string>();
  private nextId = 1;
  private centerKey = "";
  private shadows = true;

  constructor(
    private readonly seed: number,
    private readonly material: Material,
    public radius = 4,
    private readonly uploadsPerFrame = 2,
  ) {
    this.group.name = "terrain";
  }

  get chunkCount(): number {
    return this.loaded.size;
  }

  /** True once the first ring of chunks around the focus is on screen. */
  get hasInitialChunks(): boolean {
    return this.loaded.size >= Math.min(9, this.wanted.size);
  }

  update(x: number, z: number) {
    const ccx = Math.floor(x / CHUNK_SIZE);
    const ccz = Math.floor(z / CHUNK_SIZE);
    const ck = `${key(ccx, ccz)}:${this.radius}`;
    if (ck !== this.centerKey) {
      this.centerKey = ck;
      this.retarget(ccx, ccz);
    }
    for (let i = 0; i < this.uploadsPerFrame && this.ready.length; i++)
      this.upload(this.ready.shift()!);
  }

  private retarget(ccx: number, ccz: number) {
    const r = this.radius;
    const order: [number, number, number][] = [];
    this.wanted = new Set();
    for (let dz = -r; dz <= r; dz++)
      for (let dx = -r; dx <= r; dx++) {
        const d2 = dx * dx + dz * dz;
        if (d2 > r * r + r) continue;
        order.push([ccx + dx, ccz + dz, d2]);
        this.wanted.add(key(ccx + dx, ccz + dz));
      }
    order.sort((a, b) => a[2] - b[2]);

    // Unload with one chunk of hysteresis so we don't thrash at borders.
    for (const [k, mesh] of this.loaded) {
      const [cx, cz] = k.split(",").map(Number);
      if ((cx - ccx) ** 2 + (cz - ccz) ** 2 > (r + 1) ** 2 + r + 1) this.unload(k, mesh);
    }
    this.pool.cancelQueued((req) => this.wanted.has(key(req.cx, req.cz)));
    this.ready = this.ready.filter((res) => {
      const k = key(res.cx, res.cz);
      if (this.wanted.has(k)) return true;
      this.requested.delete(k);
      return false;
    });

    for (const [cx, cz] of order) {
      const k = key(cx, cz);
      if (this.loaded.has(k) || this.requested.has(k)) continue;
      this.requested.add(k);
      this.pool
        .request({ id: this.nextId++, cx, cz, seed: this.seed })
        .then((res) => this.ready.push(res))
        .catch((e: unknown) => {
          this.requested.delete(k);
          if (!(e instanceof DOMException && e.name === "AbortError"))
            console.error("terrain chunk failed", e);
        });
    }
  }

  private upload(res: ChunkResponse) {
    const k = key(res.cx, res.cz);
    this.requested.delete(k);
    if (!this.wanted.has(k) || this.loaded.has(k)) return;
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(res.data.positions, 3));
    g.setAttribute("normal", new BufferAttribute(res.data.normals, 3));
    g.setAttribute("color", new BufferAttribute(res.data.colors, 3));
    g.computeBoundingSphere();
    const mesh = new Mesh(g, this.material);
    mesh.castShadow = this.shadows;
    mesh.receiveShadow = this.shadows;
    mesh.matrixAutoUpdate = false;
    this.group.add(mesh);
    this.loaded.set(k, mesh);
  }

  private unload(k: string, mesh: Mesh) {
    this.group.remove(mesh);
    mesh.geometry.dispose();
    this.loaded.delete(k);
  }

  setShadows(enabled: boolean) {
    this.shadows = enabled;
    for (const m of this.loaded.values()) {
      m.castShadow = enabled;
      m.receiveShadow = enabled;
    }
  }

  dispose() {
    this.pool.terminate();
    for (const [k, m] of this.loaded) this.unload(k, m);
    this.ready = [];
    this.requested.clear();
  }
}
