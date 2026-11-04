/** Terrain/prop colours per season (saturated by ENV_SATURATION; snow and rock stay neutral). */
import { Color } from "three";
import type { Season } from "@/game/content/seasons";
import { vivid } from "@/render/palette";

const snow = (hexes: number[]) => hexes.map((h) => new Color(h));

export const PALETTE = {
  sand: vivid(0xdcc78f),
  wetSand: vivid(0xb9a575),
  rock: vivid(0x8f8a82, 1.15),
  darkRock: vivid(0x75716b, 1.15),
  snow: new Color(0xf1f4f6),
  trunk: vivid(0x6e4c30),
  pine: [0x2f6b4f, 0x3a7a55, 0x285e45].map((h) => vivid(h)),
  autumn: [0xd98e3a, 0xc9693a, 0xe0b23a].map((h) => vivid(h)),
  tunnel: new Color(0x2b2825),
  tunnelLining: vivid(0x6b635a, 1.05),
  portalWall: vivid(0xa39684, 1.1),
  portalFrame: vivid(0x7f7468, 1.1),
};

export interface SeasonColors {
  grass: Color[];
  meadow: Color;
  leaves: Color[];
  bush: Color[];
}

export const SEASON_COLORS: Record<Season, SeasonColors> = {
  spring: {
    grass: [0x86b95b, 0x7aad52, 0x93c466, 0x6fa24c].map((h) => vivid(h)),
    meadow: vivid(0xb3cc5e),
    leaves: [0x4f8f45, 0x5b9c4a, 0x447f3d, 0x6aa84f].map((h) => vivid(h)),
    bush: [0x4f8f45, 0x5b9c4a, 0x447f3d, 0x6aa84f].map((h) => vivid(h)),
  },
  autumn: {
    grass: [0xb0955a, 0xa2864d, 0xbc9f62, 0x957a45].map((h) => vivid(h)),
    meadow: vivid(0xc79a4a),
    leaves: [0xd98e3a, 0xc9693a, 0xe0b23a, 0xb8502e].map((h) => vivid(h)),
    bush: [0xa8663a, 0x9a7a3e, 0xb5823c, 0x8c5a34].map((h) => vivid(h)),
  },
  winter: {
    grass: snow([0xf1f4f6, 0xe6edf2, 0xf7f9fb, 0xdfe7ee]),
    meadow: new Color(0xe9eef3),
    leaves: snow([0xeef3f7, 0xe3eaf0, 0xf5f8fa, 0xe8eef3]),
    bush: snow([0xe6edf2, 0xf1f4f6, 0xdde5ec, 0xeef2f5]),
  },
};

const tmpColor = new Color();
export function jitterColor(base: Color, k: number): Color {
  return tmpColor.copy(base).multiplyScalar(0.92 + k * 0.16);
}
