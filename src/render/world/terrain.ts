/**
 * Seeded terrain generation (pure TS; runs inside chunk workers). Deterministic per world column, so
 * any chunk — and its 1-voxel border — can be generated independently.
 */
import { createNoise2D, type NoiseFunction2D } from "simplex-noise";
import { hash3, hash3f, mulberry32 } from "@/lib/rng";
import { B } from "@/render/voxel/blocks";
import { CHUNK_SIZE, CHUNK_HEIGHT } from "@/render/voxel/constants";
import { createVolume, setBlock, getBlock, type VoxelVolume } from "@/render/voxel/VoxelVolume";

export const SEA_LEVEL = 11;

export class TerrainGenerator {
  private readonly hills: NoiseFunction2D;
  private readonly detail: NoiseFunction2D;
  private readonly lakes: NoiseFunction2D;

  constructor(readonly seed: number) {
    this.hills = createNoise2D(mulberry32(seed));
    this.detail = createNoise2D(mulberry32(seed ^ 0x5bd1e995));
    this.lakes = createNoise2D(mulberry32(seed ^ 0x1b873593));
  }

  /** Surface height (top solid block y) of a world column. */
  heightAt(x: number, z: number): number {
    const broad = this.hills(x * 0.012, z * 0.012); // rolling hills
    const fine = this.detail(x * 0.06, z * 0.06) * 0.6 + this.detail(x * 0.14, z * 0.14) * 0.25;
    const lake = Math.min(0, this.lakes(x * 0.02, z * 0.02) + 0.35) * 9; // occasional basins
    // Soft terracing gives the meadow its gentle, diorama-like steps.
    const raw = 15 + broad * 6 + fine * 1.6 + lake;
    return Math.max(2, Math.min(CHUNK_HEIGHT - 12, Math.round(raw)));
  }

  /** Is there a tree trunk rooted at this column? (sparse, deterministic) */
  treeAt(x: number, z: number, h: number): boolean {
    if (h <= SEA_LEVEL + 1) return false;
    const density = 0.012 + Math.max(0, this.detail(x * 0.01 + 40, z * 0.01)) * 0.05; // groves
    return hash3f(x, 0, z, this.seed) < density;
  }

  /** Fill the padded volume of chunk (cx, cz). */
  generateChunk(cx: number, cz: number): VoxelVolume {
    const ox = cx * CHUNK_SIZE;
    const oz = cz * CHUNK_SIZE;
    const vol = createVolume(CHUNK_SIZE, CHUNK_HEIGHT, CHUNK_SIZE, ox, 0, oz);

    for (let lz = -1; lz <= CHUNK_SIZE; lz++)
      for (let lx = -1; lx <= CHUNK_SIZE; lx++) {
        const h = this.heightAt(ox + lx, oz + lz);
        const beach = h <= SEA_LEVEL + 1;
        for (let y = 0; y <= Math.max(h, SEA_LEVEL); y++) {
          let id: number;
          if (y > h) id = B.water;
          else if (y === h) id = beach ? B.sand : B.grass;
          else if (y >= h - 3) id = beach ? B.sand : B.dirt;
          else id = B.stone;
          setBlock(vol, lx, y, lz, id);
        }
      }

    // Trees can overhang chunk borders: stamp every tree rooted within reach of this volume.
    const R = 2;
    for (let wz = oz - 1 - R; wz <= oz + CHUNK_SIZE + R; wz++)
      for (let wx = ox - 1 - R; wx <= ox + CHUNK_SIZE + R; wx++) {
        const h = this.heightAt(wx, wz);
        if (this.treeAt(wx, wz, h))
          this.stampTree(vol, wx - ox, h + 1, wz - oz, hash3(wx, 1, wz, this.seed));
      }
    return vol;
  }

  private stampTree(vol: VoxelVolume, x: number, y: number, z: number, h: number) {
    const trunk = 3 + (h % 3);
    const put = (px: number, py: number, pz: number, id: number) => {
      if (px < -1 || pz < -1 || px > vol.sx || pz > vol.sz || py < 0 || py >= vol.sy) return;
      if (getBlock(vol, px, py, pz) === 0 || id === B.log) setBlock(vol, px, py, pz, id);
    };
    const top = y + trunk;
    for (let dy = -2; dy <= 1; dy++) {
      const r = dy <= -1 ? 2 : 1;
      for (let dx = -r; dx <= r; dx++)
        for (let dz = -r; dz <= r; dz++) {
          // Clip corners for a rounder canopy, deterministically.
          if (Math.abs(dx) === r && Math.abs(dz) === r && (h >> (dx + dz + 8)) & 1) continue;
          put(x + dx, top + dy, z + dz, B.leaves);
        }
    }
    for (let t = 0; t < trunk; t++) put(x, y + t, z, B.log);
  }
}
