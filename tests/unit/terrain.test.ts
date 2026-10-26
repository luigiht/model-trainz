import { describe, expect, it } from "vitest";
import { TerrainField, buildTerrainChunk, CHUNK_SIZE } from "@/render/world/terrain";

describe("low-poly terrain", () => {
  const field = new TerrainField(7);

  it("is flat under the railway", () => {
    for (let x = 0; x < 2000; x += 17) {
      const z = field.route.z(x);
      expect(field.heightAt(x, z)).toBeCloseTo(field.route.y(x) - 0.35, 5);
      expect(field.heightAt(x, z + 2)).toBeCloseTo(field.route.y(x) - 0.35, 5);
    }
  });

  it("shares exact edge vertices between neighbouring chunks", () => {
    // Global vertex (16, j) is the right edge of chunk 0 and the left edge of chunk 1.
    expect(field.vertex(16, 3)).toEqual(field.vertex(16, 3));
    const a = buildTerrainChunk(field, 0, 0);
    const b = buildTerrainChunk(field, 1, 0);
    const edge = (d: Float32Array, x: number) => {
      const out = new Set<string>();
      for (let i = 0; i < d.length; i += 3)
        if (Math.abs(d[i] - x) < 0.61 * 2)
          out.add(`${d[i].toFixed(4)},${d[i + 1].toFixed(4)},${d[i + 2].toFixed(4)}`);
      return out;
    };
    const right = edge(a.positions, CHUNK_SIZE);
    const left = edge(b.positions, CHUNK_SIZE);
    const shared = [...right].filter((v) => left.has(v));
    expect(shared.length).toBeGreaterThan(10);
  });

  it("builds deterministic, upward-facing terrain with colours", () => {
    const a = buildTerrainChunk(field, 2, -1);
    const b = buildTerrainChunk(new TerrainField(7), 2, -1);
    expect(a.positions).toEqual(b.positions);
    expect(a.colors.length).toBe(a.positions.length);
    // The heightmap part (first 16×16×2 triangles) faces up.
    for (let t = 0; t < 512; t++) expect(a.normals[t * 9 + 1]).toBeGreaterThan(0);
  });
});
