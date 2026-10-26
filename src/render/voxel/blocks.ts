/**
 * Block registry: maps block IDs to texture tiles, render class and material properties.
 * Pure data (no three.js) — shared by the mesher (also in workers) and the material.
 */

export const TILES = [
  "grass_top",
  "grass_side",
  "dirt",
  "stone",
  "gravel",
  "sand",
  "snow",
  "snow_side",
  "log_side",
  "log_top",
  "planks",
  "leaves",
  "pine_leaves",
  "brick",
  "iron",
  "brass",
  "coal",
  "water",
  "glass",
  "tie_wood",
  "rail_steel",
  "paint_green",
  "paint_black",
  "paint_red",
  "paint_yellow",
  "paint_blue",
  "paint_cream",
  "lamp",
  "window_lit",
  "red_sand",
  "basalt",
  "roof_tiles",
] as const;

export type TileName = (typeof TILES)[number];
export const TILE_INDEX = Object.fromEntries(TILES.map((t, i) => [t, i])) as Record<
  TileName,
  number
>;
export const TILE_COUNT = TILES.length;

export type RenderClass = "opaque" | "cutout" | "transparent";
export const RENDER_CLASSES: readonly RenderClass[] = ["opaque", "cutout", "transparent"];

export interface TileMaterial {
  roughness: number;
  metalness: number;
  /** Emissive strength multiplier applied to the tile colour (HDR, feeds bloom). */
  emissive: number;
}

const DEFAULT_MAT: TileMaterial = { roughness: 0.9, metalness: 0, emissive: 0 };

/** PBR-ish parameters per tile (defaults to rough dielectric). */
export const TILE_MATERIALS: Partial<Record<TileName, Partial<TileMaterial>>> = {
  stone: { roughness: 0.85 },
  sand: { roughness: 0.95 },
  snow: { roughness: 0.6 },
  snow_side: { roughness: 0.7 },
  leaves: { roughness: 0.7 },
  pine_leaves: { roughness: 0.75 },
  iron: { roughness: 0.42, metalness: 0.85 },
  brass: { roughness: 0.28, metalness: 1 },
  coal: { roughness: 0.55, metalness: 0.1 },
  water: { roughness: 0.08 },
  glass: { roughness: 0.05 },
  rail_steel: { roughness: 0.3, metalness: 0.9 },
  paint_green: { roughness: 0.45, metalness: 0.15 },
  paint_black: { roughness: 0.4, metalness: 0.2 },
  paint_red: { roughness: 0.45, metalness: 0.15 },
  paint_yellow: { roughness: 0.5, metalness: 0.1 },
  paint_blue: { roughness: 0.45, metalness: 0.15 },
  paint_cream: { roughness: 0.55, metalness: 0.05 },
  lamp: { roughness: 0.3, emissive: 4 },
  window_lit: { roughness: 0.2, emissive: 1.6 },
  basalt: { roughness: 0.8 },
  roof_tiles: { roughness: 0.7 },
};

export function tileMaterial(index: number): TileMaterial {
  return { ...DEFAULT_MAT, ...TILE_MATERIALS[TILES[index]] };
}

export interface BlockDef {
  name: string;
  /** Tile per face: +Y (top), sides, -Y (bottom). */
  top: TileName;
  side: TileName;
  bottom: TileName;
  renderClass: RenderClass;
}

function block(
  name: string,
  top: TileName,
  side = top,
  bottom = top,
  renderClass: RenderClass = "opaque",
): BlockDef {
  return { name, top, side, bottom, renderClass };
}

/** Index = block ID. ID 0 is air and has no definition. */
export const BLOCK_DEFS: readonly (BlockDef | null)[] = [
  null,
  block("grass", "grass_top", "grass_side", "dirt"),
  block("dirt", "dirt"),
  block("stone", "stone"),
  block("gravel", "gravel"),
  block("sand", "sand"),
  block("snow", "snow", "snow_side", "dirt"),
  block("log", "log_top", "log_side", "log_top"),
  block("planks", "planks"),
  block("leaves", "leaves", "leaves", "leaves", "cutout"),
  block("pine_leaves", "pine_leaves", "pine_leaves", "pine_leaves", "cutout"),
  block("brick", "brick"),
  block("iron", "iron"),
  block("brass", "brass"),
  block("coal", "coal"),
  block("water", "water", "water", "water", "transparent"),
  block("glass", "glass", "glass", "glass", "transparent"),
  block("tie_wood", "tie_wood"),
  block("rail_steel", "rail_steel"),
  block("paint_green", "paint_green"),
  block("paint_black", "paint_black"),
  block("paint_red", "paint_red"),
  block("paint_yellow", "paint_yellow"),
  block("paint_blue", "paint_blue"),
  block("paint_cream", "paint_cream"),
  block("lamp", "lamp"),
  block("window_lit", "window_lit"),
  block("red_sand", "red_sand"),
  block("basalt", "basalt"),
  block("roof_tiles", "roof_tiles"),
];

export type BlockName =
  | "air"
  | "grass"
  | "dirt"
  | "stone"
  | "gravel"
  | "sand"
  | "snow"
  | "log"
  | "planks"
  | "leaves"
  | "pine_leaves"
  | "brick"
  | "iron"
  | "brass"
  | "coal"
  | "water"
  | "glass"
  | "tie_wood"
  | "rail_steel"
  | "paint_green"
  | "paint_black"
  | "paint_red"
  | "paint_yellow"
  | "paint_blue"
  | "paint_cream"
  | "lamp"
  | "window_lit"
  | "red_sand"
  | "basalt"
  | "roof_tiles";

/** Block IDs by name, e.g. `B.grass`. */
export const B = Object.fromEntries([
  ["air", 0],
  ...BLOCK_DEFS.flatMap((d, i) => (d ? [[d.name, i]] : [])),
]) as Record<BlockName, number>;

export const BLOCK_COUNT = BLOCK_DEFS.length;

const CLASS_CODE: Record<RenderClass, number> = { opaque: 1, cutout: 2, transparent: 3 };

/** Flat lookup tables for the mesher hot loop (indexed by block ID). */
export const BLOCK_CLASS = new Uint8Array(256); // 0 air, 1 opaque, 2 cutout, 3 transparent
export const BLOCK_FACE_TILES = new Uint8Array(256 * 3); // [top, side, bottom]
for (let id = 1; id < BLOCK_DEFS.length; id++) {
  const d = BLOCK_DEFS[id]!;
  BLOCK_CLASS[id] = CLASS_CODE[d.renderClass];
  BLOCK_FACE_TILES[id * 3] = TILE_INDEX[d.top];
  BLOCK_FACE_TILES[id * 3 + 1] = TILE_INDEX[d.side];
  BLOCK_FACE_TILES[id * 3 + 2] = TILE_INDEX[d.bottom];
}

/** Blocks that darken neighbouring vertices for ambient occlusion. */
export function occludesAO(id: number): boolean {
  const c = BLOCK_CLASS[id];
  return c === 1 || c === 2;
}
