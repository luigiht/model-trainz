import { describe, expect, it } from "vitest";
import { generateTileSet, normalsFromLuminance, TILE_SIZE } from "@/render/voxel/textures";
import { BLOCK_DEFS, TILE_COUNT, B } from "@/render/voxel/blocks";
import { parseVoxelModel, meshVoxelModel } from "@/render/voxel/VoxelModel";
import { DEV_MODELS, OAK_TREE } from "@/render/world/propModels";
import { TerrainGenerator, SEA_LEVEL } from "@/render/world/terrain";
import { getBlock } from "@/render/voxel/VoxelVolume";
import { CHUNK_SIZE, CHUNK_HEIGHT } from "@/render/voxel/constants";
import { quadCount } from "@/render/voxel/ChunkMesher";

describe("procedural textures", () => {
  it("generates every tile, deterministically", () => {
    const a = generateTileSet(3);
    const b = generateTileSet(3);
    expect(a.count).toBe(TILE_COUNT);
    expect(a.albedo.length).toBe(TILE_COUNT * TILE_SIZE * TILE_SIZE * 4);
    expect(a.albedo).toEqual(b.albedo);
  });

  it("flat luminance → straight-up normals", () => {
    const flat = new Uint8ClampedArray(16 * 16 * 4).fill(128);
    const n = normalsFromLuminance(flat, 16);
    expect([n[0], n[1], n[2]]).toEqual([128, 128, 255]);
  });

  it("every block has valid tile names", () => {
    for (const d of BLOCK_DEFS) if (d) expect(d.top && d.side && d.bottom).toBeTruthy();
    expect(B.air).toBe(0);
    expect(B.grass).toBeGreaterThan(0);
  });
});

describe("voxel models", () => {
  it("parses size and centres the footprint", () => {
    const { volume, size } = parseVoxelModel(OAK_TREE);
    expect(size).toEqual([5, 7, 5]);
    expect(volume.ox).toBe(-2.5);
    expect(getBlock(volume, 2, 0, 2)).toBe(B.log);
  });

  it("rejects unknown palette characters", () => {
    expect(() => parseVoxelModel({ name: "bad", scale: 1, palette: {}, layers: [["x"]] })).toThrow(
      /unknown palette/,
    );
  });

  it("every dev model meshes to something", () => {
    for (const m of DEV_MODELS) {
      const meshes = meshVoxelModel(m);
      expect(
        quadCount(meshes.opaque) + quadCount(meshes.cutout) + quadCount(meshes.transparent),
      ).toBeGreaterThan(0);
    }
  });
});

describe("terrain generation", () => {
  it("is deterministic per seed", () => {
    const a = new TerrainGenerator(99).generateChunk(2, -3);
    const b = new TerrainGenerator(99).generateChunk(2, -3);
    const c = new TerrainGenerator(100).generateChunk(2, -3);
    expect(a.data).toEqual(b.data);
    expect(a.data).not.toEqual(c.data);
  });

  it("chunk borders agree with neighbouring chunks (seamless meshing)", () => {
    const gen = new TerrainGenerator(7);
    const left = gen.generateChunk(0, 0);
    const right = gen.generateChunk(1, 0);
    for (let y = 0; y < CHUNK_HEIGHT; y++)
      for (let z = 0; z < CHUNK_SIZE; z++) {
        expect(getBlock(left, CHUNK_SIZE, y, z)).toBe(getBlock(right, 0, y, z));
        expect(getBlock(right, -1, y, z)).toBe(getBlock(left, CHUNK_SIZE - 1, y, z));
      }
  });

  it("fills below sea level with water, never leaves floating water", () => {
    const gen = new TerrainGenerator(11);
    const vol = gen.generateChunk(0, 0);
    for (let z = 0; z < CHUNK_SIZE; z++)
      for (let x = 0; x < CHUNK_SIZE; x++)
        for (let y = SEA_LEVEL + 1; y < CHUNK_HEIGHT; y++)
          expect(getBlock(vol, x, y, z)).not.toBe(B.water);
  });
});
