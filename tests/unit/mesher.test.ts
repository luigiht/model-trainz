import { describe, expect, it } from "vitest";
import { meshVolume, quadCount, type MeshArrays } from "@/render/voxel/ChunkMesher";
import { createVolume, setBlock, type VoxelVolume } from "@/render/voxel/VoxelVolume";
import { B } from "@/render/voxel/blocks";

function vol(n = 4): VoxelVolume {
  return createVolume(n, n, n);
}

function fill(
  v: VoxelVolume,
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
  id: number,
) {
  for (let y = y0; y <= y1; y++)
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) setBlock(v, x, y, z, id);
}

/** Quads whose normal equals n. */
function facesWithNormal(m: MeshArrays, n: [number, number, number]): number[] {
  const out: number[] = [];
  for (let q = 0; q < m.positions.length / 12; q++) {
    const i = q * 4 * 3;
    if (
      Math.sign(m.normals[i]) === n[0] &&
      Math.sign(m.normals[i + 1]) === n[1] &&
      Math.sign(m.normals[i + 2]) === n[2]
    )
      out.push(q);
  }
  return out;
}

describe("ChunkMesher (greedy + AO)", () => {
  it("single block → 6 quads, fully lit", () => {
    const v = vol();
    setBlock(v, 1, 1, 1, B.stone);
    const m = meshVolume(v).opaque;
    expect(quadCount(m)).toBe(6);
    expect([...m.ao].every((a) => a === 3)).toBe(true);
  });

  it("solid 2×2×2 cube merges into 6 quads", () => {
    const v = vol();
    fill(v, 0, 0, 0, 1, 1, 1, B.stone);
    expect(quadCount(meshVolume(v).opaque)).toBe(6);
  });

  it("whole 4×4×4 volume merges into 6 quads", () => {
    const v = vol();
    fill(v, 0, 0, 0, 3, 3, 3, B.dirt);
    expect(quadCount(meshVolume(v).opaque)).toBe(6);
  });

  it("different block types never merge", () => {
    const v = vol();
    setBlock(v, 0, 0, 0, B.stone);
    setBlock(v, 1, 0, 0, B.dirt);
    // 2 end caps + 4 sides × 2 blocks
    expect(quadCount(meshVolume(v).opaque)).toBe(10);
  });

  it("culls faces against padded neighbours in the border", () => {
    const v = vol(1);
    setBlock(v, 0, 0, 0, B.stone);
    setBlock(v, 1, 0, 0, B.stone); // border voxel (belongs to the next chunk)
    setBlock(v, 0, -1, 0, B.stone);
    const m = meshVolume(v).opaque;
    expect(quadCount(m)).toBe(4);
    expect(facesWithNormal(m, [1, 0, 0])).toHaveLength(0);
    expect(facesWithNormal(m, [0, -1, 0])).toHaveLength(0);
  });

  it("water: no internal faces; stone faces behind water are drawn", () => {
    const v = vol();
    setBlock(v, 0, 0, 0, B.water);
    setBlock(v, 1, 0, 0, B.water);
    setBlock(v, 2, 0, 0, B.stone);
    const meshes = meshVolume(v);
    expect(quadCount(meshes.transparent)).toBe(5); // 4 merged sides + 1 end cap (other end touches stone)
    expect(facesWithNormal(meshes.opaque, [-1, 0, 0])).toHaveLength(1);
    expect(facesWithNormal(meshes.transparent, [1, 0, 0])).toHaveLength(0);
  });

  it("leaves go to the cutout mesh", () => {
    const v = vol();
    setBlock(v, 0, 0, 0, B.leaves);
    const meshes = meshVolume(v);
    expect(quadCount(meshes.cutout)).toBe(6);
    expect(quadCount(meshes.opaque)).toBe(0);
  });

  it("bakes AO where a block sits on a floor, and splits quads by AO", () => {
    const v = vol(5);
    fill(v, 0, 0, 0, 4, 0, 4, B.stone);
    setBlock(v, 2, 1, 2, B.stone);
    const m = meshVolume(v).opaque;
    const tops = facesWithNormal(m, [0, 1, 0]);
    // Floor top would be 1 quad without AO; occlusion around the block splits it up.
    expect(tops.length).toBeGreaterThan(2);
    const darkened = tops.some((q) => [0, 1, 2, 3].some((k) => m.ao[q * 4 + k] < 3));
    expect(darkened).toBe(true);
    // The block's own top is unoccluded.
    const blockTop = tops.find((q) => m.positions[q * 12 + 1] === 2);
    expect(blockTop).toBeDefined();
    expect([0, 1, 2, 3].every((k) => m.ao[blockTop! * 4 + k] === 3)).toBe(true);
  });

  it("produces valid buffers (indices in range, winding faces outward)", () => {
    const v = vol();
    fill(v, 0, 0, 0, 2, 0, 2, B.grass);
    setBlock(v, 1, 1, 1, B.log);
    const m = meshVolume(v).opaque;
    const vc = m.positions.length / 3;
    expect(m.uvs.length / 2).toBe(vc);
    expect(m.ao.length).toBe(vc);
    expect(m.tiles.length).toBe(vc);
    expect(Math.max(...m.indices)).toBeLessThan(vc);
    for (let t = 0; t < m.indices.length; t += 3) {
      const [a, b, c] = [m.indices[t], m.indices[t + 1], m.indices[t + 2]];
      const p = (i: number) => [m.positions[i * 3], m.positions[i * 3 + 1], m.positions[i * 3 + 2]];
      const [pa, pb, pc] = [p(a), p(b), p(c)];
      const e1 = pb.map((x, i) => x - pa[i]);
      const e2 = pc.map((x, i) => x - pa[i]);
      const cross = [
        e1[1] * e2[2] - e1[2] * e2[1],
        e1[2] * e2[0] - e1[0] * e2[2],
        e1[0] * e2[1] - e1[1] * e2[0],
      ];
      const n = [m.normals[a * 3], m.normals[a * 3 + 1], m.normals[a * 3 + 2]];
      expect(cross[0] * n[0] + cross[1] * n[1] + cross[2] * n[2]).toBeGreaterThan(0);
    }
  });

  it("uses top/side/bottom tiles for grass", () => {
    const v = vol();
    setBlock(v, 0, 0, 0, B.grass);
    const m = meshVolume(v).opaque;
    const tileOf = (n: [number, number, number]) => m.tiles[facesWithNormal(m, n)[0] * 4];
    expect(tileOf([0, 1, 0])).not.toBe(tileOf([1, 0, 0]));
    expect(tileOf([0, -1, 0])).not.toBe(tileOf([0, 1, 0]));
    expect(tileOf([1, 0, 0])).toBe(tileOf([0, 0, -1]));
  });

  it("applies the volume origin offset", () => {
    const v = createVolume(2, 2, 2, 32, 0, -16);
    setBlock(v, 0, 0, 0, B.stone);
    const xs = meshVolume(v).opaque.positions.filter((_, i) => i % 3 === 0);
    expect(Math.min(...xs)).toBe(32);
    expect(Math.max(...xs)).toBe(33);
  });
});
