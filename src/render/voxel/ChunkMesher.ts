/**
 * Greedy mesher with per-vertex ambient occlusion (pure TS, runs in workers and tests).
 *
 * For each axis and direction, every slice builds a 2D mask of visible faces keyed by
 * (block ID, packed AO of its 4 corners). Rectangles of identical keys are merged, so merged quads
 * never mix AO values (no smearing artifacts). UVs are world-space voxel coordinates; the material
 * samples a texture array with repeat wrapping, so a merged quad tiles its texture per voxel.
 */
import {
  BLOCK_CLASS,
  BLOCK_FACE_TILES,
  RENDER_CLASSES,
  type RenderClass,
  occludesAO,
} from "./blocks";
import { type VoxelVolume, volumeIndex } from "./VoxelVolume";

export interface MeshArrays {
  positions: Float32Array;
  normals: Int8Array;
  uvs: Float32Array;
  /** Per-vertex AO level 0 (darkest) … 3 (unoccluded). */
  ao: Uint8Array;
  /** Texture-array layer per vertex. */
  tiles: Uint8Array;
  indices: Uint32Array;
}

export type ChunkMeshes = Record<RenderClass, MeshArrays>;

class MeshBuilder {
  private pos = new Float32Array(4096);
  private nrm = new Int8Array(4096);
  private uv = new Float32Array(2731);
  private ao = new Uint8Array(1366);
  private tile = new Uint8Array(1366);
  private idx = new Uint32Array(2048);
  vertexCount = 0;
  indexCount = 0;

  private grow() {
    const v = this.vertexCount;
    if ((v + 4) * 3 > this.pos.length) {
      const cap = this.pos.length * 2;
      this.pos = resize(this.pos, cap);
      this.nrm = resize(this.nrm, cap);
      this.uv = resize(this.uv, (cap / 3) * 2);
      this.ao = resize(this.ao, cap / 3);
      this.tile = resize(this.tile, cap / 3);
    }
    if (this.indexCount + 6 > this.idx.length) this.idx = resize(this.idx, this.idx.length * 2);
  }

  /**
   * Corners are given in quad order (c0..c3) counter-clockwise when viewed from the face normal.
   * `flip` chooses the 1–3 diagonal instead of 0–2 (AO anisotropy fix).
   */
  quad(
    corners: number[],
    nx: number,
    ny: number,
    nz: number,
    uvs: number[],
    ao: number[],
    tile: number,
    flip: boolean,
  ) {
    this.grow();
    const base = this.vertexCount;
    for (let i = 0; i < 4; i++) {
      const v = base + i;
      this.pos[v * 3] = corners[i * 3];
      this.pos[v * 3 + 1] = corners[i * 3 + 1];
      this.pos[v * 3 + 2] = corners[i * 3 + 2];
      this.nrm[v * 3] = nx * 127;
      this.nrm[v * 3 + 1] = ny * 127;
      this.nrm[v * 3 + 2] = nz * 127;
      this.uv[v * 2] = uvs[i * 2];
      this.uv[v * 2 + 1] = uvs[i * 2 + 1];
      this.ao[v] = ao[i];
      this.tile[v] = tile;
    }
    const k = this.indexCount;
    if (flip) {
      this.idx.set([base + 1, base + 2, base + 3, base + 1, base + 3, base], k);
    } else {
      this.idx.set([base, base + 1, base + 2, base, base + 2, base + 3], k);
    }
    this.vertexCount += 4;
    this.indexCount += 6;
  }

  build(): MeshArrays {
    const v = this.vertexCount;
    return {
      positions: this.pos.slice(0, v * 3),
      normals: this.nrm.slice(0, v * 3),
      uvs: this.uv.slice(0, v * 2),
      ao: this.ao.slice(0, v),
      tiles: this.tile.slice(0, v),
      indices: this.idx.slice(0, this.indexCount),
    };
  }
}

function resize<T extends Float32Array | Int8Array | Uint8Array | Uint32Array>(a: T, n: number): T {
  const out = new (a.constructor as new (n: number) => T)(Math.ceil(n));
  out.set(a);
  return out;
}

/** Should the face of block `a` facing neighbour `b` be drawn? */
function faceVisible(a: number, b: number): boolean {
  if (a === 0) return false;
  const cb = BLOCK_CLASS[b];
  if (cb === 0) return true; // air
  if (cb === 1) return false; // opaque neighbour hides it
  return a !== b; // see-through neighbour: draw unless it's the same block (water/water, leaves/leaves)
}

const AO_CORNERS = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
];

export function meshVolume(vol: VoxelVolume): ChunkMeshes {
  const builders: Record<RenderClass, MeshBuilder> = {
    opaque: new MeshBuilder(),
    cutout: new MeshBuilder(),
    transparent: new MeshBuilder(),
  };
  const dims = [vol.sx, vol.sy, vol.sz];
  const origin = [vol.ox, vol.oy, vol.oz];
  const data = vol.data;
  // Strides in the padded array for +1 along x, y, z.
  const stride = [1, (vol.sx + 2) * (vol.sz + 2), vol.sx + 2];
  const occ = new Uint8Array(256);
  for (let i = 0; i < 256; i++) occ[i] = occludesAO(i) ? 1 : 0;

  const pos = [0, 0, 0];
  const corners = new Array<number>(12);
  const uvs = new Array<number>(8);
  const aoOut = [0, 0, 0, 0];

  for (let d = 0; d < 3; d++) {
    const u = (d + 1) % 3;
    const v = (d + 2) % 3;
    const du = dims[u];
    const dv = dims[v];
    const mask = new Int32Array(du * dv);
    const sd = stride[d];
    const su = stride[u];
    const sv = stride[v];

    for (const dir of [-1, 1]) {
      const n = [0, 0, 0];
      n[d] = dir;
      // Which tile slot the face uses: 0 top, 1 side, 2 bottom.
      const faceSlot = d === 1 ? (dir > 0 ? 0 : 2) : 1;

      for (let slice = 0; slice < dims[d]; slice++) {
        pos[d] = slice;
        // 1. Build mask of face keys for this slice.
        let m = 0;
        for (let j = 0; j < dv; j++) {
          pos[v] = j;
          for (let i = 0; i < du; i++, m++) {
            pos[u] = i;
            const idx = volumeIndex(vol, pos[0], pos[1], pos[2]);
            const a = data[idx];
            const front = idx + dir * sd;
            if (!faceVisible(a, data[front])) {
              mask[m] = 0;
              continue;
            }
            // AO from the 8 neighbours around the cell in front of the face.
            let aoKey = 0;
            for (let c = 0; c < 4; c++) {
              const cu = AO_CORNERS[c][0] * su;
              const cv = AO_CORNERS[c][1] * sv;
              const s1 = occ[data[front + cu]];
              const s2 = occ[data[front + cv]];
              const cc = occ[data[front + cu + cv]];
              const level = s1 && s2 ? 0 : 3 - (s1 + s2 + cc);
              aoKey |= level << (c * 2);
            }
            mask[m] = a | (aoKey << 8);
          }
        }

        // 2. Greedy merge rectangles of equal keys.
        m = 0;
        for (let j = 0; j < dv; j++) {
          for (let i = 0; i < du;) {
            const key = mask[m];
            if (key === 0) {
              i++;
              m++;
              continue;
            }
            let w = 1;
            while (i + w < du && mask[m + w] === key) w++;
            let h = 1;
            outer: for (; j + h < dv; h++) {
              for (let k = 0; k < w; k++) if (mask[m + k + h * du] !== key) break outer;
            }
            emitQuad(key, i, j, w, h);
            for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) mask[m + x + y * du] = 0;
            i += w;
            m += w;
          }
        }
      }

      function emitQuad(key: number, i: number, j: number, w: number, h: number) {
        const block = key & 0xff;
        const aoKey = key >> 8;
        for (let c = 0; c < 4; c++) aoOut[c] = (aoKey >> (c * 2)) & 3;
        // Quad corners in (u, v): (i,j) (i+w,j) (i+w,j+h) (i,j+h); plane at slice (+1 if facing +).
        const plane = pos[d] + (dir > 0 ? 1 : 0) + origin[d];
        const cu = [i, i + w, i + w, i];
        const cv = [j, j, j + h, j + h];
        // Reverse winding for negative faces so triangles stay front-facing.
        const order = dir > 0 ? [0, 1, 2, 3] : [0, 3, 2, 1];
        const ao = [0, 0, 0, 0];
        for (let k = 0; k < 4; k++) {
          const c = order[k];
          const p = [0, 0, 0];
          p[d] = plane;
          p[u] = cu[c] + origin[u];
          p[v] = cv[c] + origin[v];
          corners[k * 3] = p[0];
          corners[k * 3 + 1] = p[1];
          corners[k * 3 + 2] = p[2];
          // Texture axes: horizontal along x or z, vertical along y for side faces.
          if (d === 0) {
            uvs[k * 2] = dir > 0 ? -p[2] : p[2];
            uvs[k * 2 + 1] = p[1];
          } else if (d === 2) {
            uvs[k * 2] = dir > 0 ? p[0] : -p[0];
            uvs[k * 2 + 1] = p[1];
          } else {
            uvs[k * 2] = p[0];
            uvs[k * 2 + 1] = dir > 0 ? -p[2] : p[2];
          }
          ao[k] = aoOut[c];
        }
        const cls = BLOCK_CLASS[block];
        const builder = builders[RENDER_CLASSES[cls - 1]];
        const tile = BLOCK_FACE_TILES[block * 3 + faceSlot];
        const flip = ao[0] + ao[2] < ao[1] + ao[3];
        builder.quad(corners, n[0], n[1], n[2], uvs, ao, tile, flip);
      }
    }
  }

  return {
    opaque: builders.opaque.build(),
    cutout: builders.cutout.build(),
    transparent: builders.transparent.build(),
  };
}

/** All ArrayBuffers in a mesh result, for zero-copy `postMessage` transfer. */
export function meshTransferables(meshes: ChunkMeshes): ArrayBuffer[] {
  return RENDER_CLASSES.flatMap((c) => {
    const m = meshes[c];
    return [m.positions, m.normals, m.uvs, m.ao, m.tiles, m.indices].map(
      (a) => a.buffer as ArrayBuffer,
    );
  });
}

export function quadCount(m: MeshArrays): number {
  return m.indices.length / 6;
}
