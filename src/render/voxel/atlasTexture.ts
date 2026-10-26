import {
  DataArrayTexture,
  LinearMipmapLinearFilter,
  NearestFilter,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  type ColorSpace,
} from "three";
import { generateTileSet, type TileSet } from "./textures";

/**
 * Uploads the procedural tiles as WebGL2 texture arrays (one layer per tile). Arrays — rather than a
 * 2D atlas — let greedy-merged quads repeat a tile across their surface and allow mipmaps without
 * bleeding between neighbouring tiles.
 */
function toArrayTexture(
  src: Uint8ClampedArray,
  set: TileSet,
  colorSpace: ColorSpace,
): DataArrayTexture {
  const { size, count } = set;
  const stride = size * size * 4;
  const data = new Uint8Array(src.length);
  // Painted rows run top→bottom; textures want bottom→top.
  for (let t = 0; t < count; t++)
    for (let y = 0; y < size; y++) {
      const from = t * stride + y * size * 4;
      const to = t * stride + (size - 1 - y) * size * 4;
      data.set(src.subarray(from, from + size * 4), to);
    }
  const tex = new DataArrayTexture(data, size, size, count);
  tex.colorSpace = colorSpace;
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.magFilter = NearestFilter;
  // Crisp pixels up close, smooth (non-shimmering) minification in the distance.
  tex.minFilter = LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

export interface VoxelTextures {
  albedo: DataArrayTexture;
  normals: DataArrayTexture;
  dispose(): void;
}

export function createVoxelTextures(seed = 7): VoxelTextures {
  const set = generateTileSet(seed);
  const albedo = toArrayTexture(set.albedo, set, SRGBColorSpace);
  const normals = toArrayTexture(set.normals, set, NoColorSpace);
  return {
    albedo,
    normals,
    dispose() {
      albedo.dispose();
      normals.dispose();
    },
  };
}
