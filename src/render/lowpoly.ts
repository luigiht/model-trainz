import { MeshStandardMaterial, type ColorRepresentation } from "three";

/** Flat-shaded material factory for the low-poly look. */
export function flatMaterial(
  color: ColorRepresentation,
  opts: {
    roughness?: number;
    metalness?: number;
    emissive?: ColorRepresentation;
    emissiveIntensity?: number;
  } = {},
) {
  return new MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: opts.roughness ?? 0.8,
    metalness: opts.metalness ?? 0,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 0,
  });
}

/** Low-poly palette shared by scene components. */
export const COLORS = {
  ballast: 0x9a948c,
  sleeper: 0x6b4a33,
  rail: 0xc3c7cf,
  locoGreen: 0x2f7a4f,
  locoBlack: 0x23262a,
  brass: 0xd6a94a,
  wheelRed: 0xb3392f,
  cream: 0xf0e2bf,
  maroon: 0x8a2f3a,
  roofRed: 0xb5533c,
  stone: 0xbfb6a8,
  wood: 0x8a6240,
  lamp: 0xffd38a,
  window: 0x2f3a46,
  windowLit: 0xffc977,
};
