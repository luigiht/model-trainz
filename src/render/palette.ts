import { Color } from "three";

/**
 * Global saturation multiplier for the environment (terrain, foliage, rocks, water, sky).
 * 1 = the hand-picked base palette; raise for a more colourful world.
 */
export const ENV_SATURATION = 1.4;

const hsl = { h: 0, s: 0, l: 0 };

/** A colour with its HSL saturation scaled (sRGB hex in, three.js Color out). */
export function vivid(hex: number, saturation = ENV_SATURATION): Color {
  const c = new Color(hex);
  c.getHSL(hsl);
  return c.setHSL(hsl.h, Math.min(1, hsl.s * saturation), hsl.l);
}

/** Same as `vivid`, returned as a CSS hex string (for R3F colour props). */
export function vividCss(hex: number, saturation = ENV_SATURATION): string {
  return `#${vivid(hex, saturation).getHexString()}`;
}
