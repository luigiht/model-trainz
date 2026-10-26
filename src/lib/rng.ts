/** Seeded PRNG + integer hashing. Deterministic across platforms (32-bit integer math only). */

/** mulberry32: tiny, fast, good enough for gameplay and world gen. Returns floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash 3 integers (+ seed) to a uint32. Used for per-voxel colour jitter and placement. */
export function hash3(x: number, y: number, z: number, seed = 0): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (x | 0), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13) ^ (y | 0), 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 16) ^ (z | 0), 0x27d4eb2f);
  h ^= h >>> 15;
  return h >>> 0;
}

/** hash3 mapped to [0, 1). */
export function hash3f(x: number, y: number, z: number, seed = 0): number {
  return hash3(x, y, z, seed) / 4294967296;
}

/** Derive a stable integer seed from a string (FNV-1a). */
export function seedFromString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
