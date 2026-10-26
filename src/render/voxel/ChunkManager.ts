import { Group, Mesh } from "three";
import { RENDER_CLASSES } from "./blocks";
import { CHUNK_SIZE } from "./constants";
import { meshArraysToGeometry } from "./geometry";
import type { VoxelMaterials } from "@/render/materials/voxelMaterial";
import { ChunkWorkerPool } from "@/render/workers/ChunkWorkerPool";
import type { ChunkResponse } from "@/render/workers/chunkProtocol";

interface LoadedChunk {
  meshes: Mesh[];
}

const key = (cx: number, cz: number) => `${cx},${cz}`;

/**
 * Streams terrain chunks around a focus point: requests missing chunks from the worker pool
 * (nearest first), uploads at most `uploadsPerFrame` finished chunks per frame, and disposes chunks
 * that leave the radius. Owns its meshes/geometries; materials are shared and owned by the caller.
 */
export class ChunkManager {
  readonly group = new Group();
  private loaded = new Map<string, LoadedChunk>();
  private requested = new Set<string>();
  private ready: ChunkResponse[] = [];
  private pool = new ChunkWorkerPool();
  private nextId = 1;
  private centerKey = "";
  private wanted = new Set<string>();
  shadows = true;

  constructor(
    private readonly seed: number,
    private readonly materials: VoxelMaterials,
    public radius = 4,
    private readonly uploadsPerFrame = 2,
  ) {
    this.group.name = "terrain";
  }

  get chunkCount(): number {
    return this.loaded.size;
  }

  get isIdle(): boolean {
    return this.pool.pending === 0 && this.ready.length === 0 && this.loaded.size > 0;
  }

  /** Call every frame with the world-space focus position. Cheap when nothing changed. */
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
        if (d2 > r * r + r) continue; // round footprint
        order.push([ccx + dx, ccz + dz, d2]);
        this.wanted.add(key(ccx + dx, ccz + dz));
      }
    order.sort((a, b) => a[2] - b[2]);

    // Unload chunks out of range (with one chunk of hysteresis to avoid thrashing at borders).
    for (const [k, chunk] of this.loaded) {
      const [cx, cz] = k.split(",").map(Number);
      if ((cx - ccx) ** 2 + (cz - ccz) ** 2 > (r + 1) ** 2 + r + 1) this.unload(k, chunk);
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
            console.error("chunk failed", e);
        });
    }
  }

  private upload(res: ChunkResponse) {
    const k = key(res.cx, res.cz);
    this.requested.delete(k);
    if (!this.wanted.has(k) || this.loaded.has(k)) return;
    const meshes: Mesh[] = [];
    for (const cls of RENDER_CLASSES) {
      const geometry = meshArraysToGeometry(res.meshes[cls]);
      if (!geometry) continue;
      const mesh = new Mesh(geometry, this.materials[cls]);
      mesh.castShadow = this.shadows && cls !== "transparent";
      mesh.receiveShadow = this.shadows;
      mesh.matrixAutoUpdate = false;
      if (cls === "transparent") mesh.renderOrder = 1;
      meshes.push(mesh);
      this.group.add(mesh);
    }
    this.loaded.set(k, { meshes });
  }

  private unload(k: string, chunk: LoadedChunk) {
    for (const m of chunk.meshes) {
      this.group.remove(m);
      m.geometry.dispose();
    }
    this.loaded.delete(k);
  }

  setShadows(enabled: boolean) {
    this.shadows = enabled;
    for (const { meshes } of this.loaded.values())
      for (const m of meshes) {
        m.castShadow = enabled && m.material !== this.materials.transparent;
        m.receiveShadow = enabled;
      }
  }

  dispose() {
    this.pool.terminate();
    for (const [k, chunk] of this.loaded) this.unload(k, chunk);
    this.ready = [];
    this.requested.clear();
  }
}
