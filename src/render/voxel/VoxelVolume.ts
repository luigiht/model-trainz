/**
 * A box of block IDs with a 1-voxel border on every side. The border holds neighbouring blocks
 * (from adjacent chunks, or air for standalone models) so the mesher can cull faces and compute AO
 * without any cross-chunk lookups — which keeps meshing self-contained and worker-friendly.
 */
export interface VoxelVolume {
  /** Interior size. Valid coordinates are -1..size (inclusive) on each axis. */
  sx: number;
  sy: number;
  sz: number;
  data: Uint8Array;
  /** World-space position of interior voxel (0,0,0). */
  ox: number;
  oy: number;
  oz: number;
}

export function createVolume(
  sx: number,
  sy: number,
  sz: number,
  ox = 0,
  oy = 0,
  oz = 0,
): VoxelVolume {
  return { sx, sy, sz, ox, oy, oz, data: new Uint8Array((sx + 2) * (sy + 2) * (sz + 2)) };
}

/** Flat index; x/z are the fastest axes so horizontal slices are contiguous. */
export function volumeIndex(v: VoxelVolume, x: number, y: number, z: number): number {
  return x + 1 + (v.sx + 2) * (z + 1 + (v.sz + 2) * (y + 1));
}

export function getBlock(v: VoxelVolume, x: number, y: number, z: number): number {
  return v.data[volumeIndex(v, x, y, z)];
}

export function setBlock(v: VoxelVolume, x: number, y: number, z: number, id: number): void {
  v.data[volumeIndex(v, x, y, z)] = id;
}

export function inPaddedBounds(v: VoxelVolume, x: number, y: number, z: number): boolean {
  return x >= -1 && y >= -1 && z >= -1 && x <= v.sx && y <= v.sy && z <= v.sz;
}
