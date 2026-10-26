/**
 * Quality tiers. Pure data + helpers (no three.js imports) so they can be unit-tested and read by
 * both the renderer and the settings UI. Each user toggle can only *remove* an effect that the tier
 * allows; it can never force an effect on above its tier.
 */

export const QUALITY_LEVELS = ["low", "medium", "high", "ultra"] as const;
export type QualityLevel = (typeof QUALITY_LEVELS)[number];
export type QualitySetting = QualityLevel | "auto";

export interface QualityTier {
  /** Upper bound for device pixel ratio before the resolution-scale setting is applied. */
  maxDpr: number;
  shadows: boolean;
  shadowMapSize: number;
  ssao: boolean;
  bloom: boolean;
  smaa: boolean;
  vignette: boolean;
  /** Tilt-shift DOF, applied in the isometric camera only. */
  tiltShift: boolean;
  godRays: boolean;
  /** Voxel edge highlight strength (0 = off). */
  bevel: number;
}

export const QUALITY_TIERS: Record<QualityLevel, QualityTier> = {
  low: {
    maxDpr: 1,
    shadows: false,
    shadowMapSize: 512,
    ssao: false,
    bloom: false,
    smaa: false,
    vignette: false,
    tiltShift: false,
    godRays: false,
    bevel: 0,
  },
  medium: {
    maxDpr: 1.25,
    shadows: true,
    shadowMapSize: 1024,
    ssao: false,
    bloom: true,
    smaa: true,
    vignette: false,
    tiltShift: false,
    godRays: false,
    bevel: 0,
  },
  high: {
    maxDpr: 1.5,
    shadows: true,
    shadowMapSize: 2048,
    ssao: true,
    bloom: true,
    smaa: true,
    vignette: true,
    tiltShift: true,
    godRays: false,
    bevel: 0.07,
  },
  ultra: {
    maxDpr: 1.75,
    shadows: true,
    shadowMapSize: 4096,
    ssao: true,
    bloom: true,
    smaa: true,
    vignette: true,
    tiltShift: true,
    godRays: true,
    bevel: 0.07,
  },
};

export interface EffectToggles {
  shadows: boolean;
  ssao: boolean;
  bloom: boolean;
  tiltShift: boolean;
}

/** The effects actually rendered: tier capability AND user toggle. */
export function resolveEffects(level: QualityLevel, toggles: EffectToggles): QualityTier {
  const tier = QUALITY_TIERS[level];
  return {
    ...tier,
    shadows: tier.shadows && toggles.shadows,
    ssao: tier.ssao && toggles.ssao,
    bloom: tier.bloom && toggles.bloom,
    tiltShift: tier.tiltShift && toggles.tiltShift,
  };
}

/** DPR range for the canvas, combining tier cap, resolution scale (0.5–1) and device DPR. */
export function resolveDpr(
  level: QualityLevel,
  resolutionScale: number,
  deviceDpr: number,
): number {
  const scale = Math.min(1, Math.max(0.5, resolutionScale));
  return Math.max(0.5, Math.min(deviceDpr, QUALITY_TIERS[level].maxDpr) * scale);
}

/** The level used to start "auto" mode before the governor has measured anything. */
export const AUTO_START_LEVEL: QualityLevel = "medium";

export function stepQuality(level: QualityLevel, delta: -1 | 1): QualityLevel {
  const i = QUALITY_LEVELS.indexOf(level) + delta;
  return QUALITY_LEVELS[Math.min(QUALITY_LEVELS.length - 1, Math.max(0, i))];
}
