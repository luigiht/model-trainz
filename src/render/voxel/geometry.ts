import { BufferAttribute, BufferGeometry } from "three";
import type { MeshArrays } from "./ChunkMesher";

/** Wrap mesher output in a BufferGeometry (no copies: typed arrays are used directly). */
export function meshArraysToGeometry(m: MeshArrays): BufferGeometry | null {
  if (m.indices.length === 0) return null;
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(m.positions, 3));
  g.setAttribute("normal", new BufferAttribute(m.normals, 3, true));
  g.setAttribute("uv", new BufferAttribute(m.uvs, 2));
  g.setAttribute("aAo", new BufferAttribute(m.ao, 1));
  g.setAttribute("aTile", new BufferAttribute(m.tiles, 1));
  const vertexCount = m.positions.length / 3;
  g.setIndex(new BufferAttribute(vertexCount < 65536 ? Uint16Array.from(m.indices) : m.indices, 1));
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}
