/**
 * Seasons change with distance along the line: spring → autumn → winter → spring … Pure TS so the
 * terrain workers (ground/tree colours) and the scene (sky, light, water) agree on the mix.
 */
import { smoothstep } from "@/lib/math";

export type Season = "spring" | "autumn" | "winter";
export const SEASONS: readonly Season[] = ["spring", "autumn", "winter"];

/** World-x distance each season lasts (about eleven stations once legs reach full length). */
export const SEASON_LENGTH = 900;
/** Fraction of a season spent blending into the next one. */
const BLEND = 0.18;

export type SeasonMix = Record<Season, number>;

/** How much of each season applies at world x (the weights sum to 1). */
export function seasonMix(x: number, out: SeasonMix = { spring: 1, autumn: 0, winter: 0 }) {
  const phase = Math.max(0, x) / SEASON_LENGTH;
  const i = Math.floor(phase);
  const t = smoothstep(1 - BLEND, 1, phase - i);
  out.spring = out.autumn = out.winter = 0;
  out[SEASONS[i % 3]] += 1 - t;
  out[SEASONS[(i + 1) % 3]] += t;
  return out;
}

const tmp: SeasonMix = { spring: 1, autumn: 0, winter: 0 };

/** One season for a face or prop at x; `k` in [0, 1) dithers the blend into patches. */
export function seasonAt(x: number, k: number): Season {
  const m = seasonMix(x, tmp);
  if (k < m.spring) return "spring";
  if (k < m.spring + m.autumn) return "autumn";
  return "winter";
}
