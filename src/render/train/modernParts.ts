/** Shared low-poly parts and body profile for the modern (diesel) train sets. */
import { CylinderGeometry } from "three";
import type { Builder } from "./trainModels";
import type { Profile } from "./loft";

/** Underside of the bodyshell (just above the bogies). */
export const BASE = 1.2;
/** Widest half-width of the standard bodies; side details sit just proud of it. */
export const HW = 0.92;
export const DARK = 0x2b2f34;
export const LAMP = 0xfff3d6;
export const TAIL = 0xff3b30;
export const GLASS = 0x1c242c;
const STEEL = { roughness: 0.6, metalness: 0.3 };

/** Rounded intercity coach / loco: tumblehome below, vertical sides, curved roof. */
export const ROUND_PROFILE: Profile = [
  [0.8, BASE],
  [0.88, 1.3],
  [HW, 1.48],
  [HW, 2.55],
  [0.9, 2.68],
  [0.84, 2.8],
  [0.72, 2.89],
  [0.5, 2.96],
  [0.22, 3.0],
];

/** Windscreen wiper lying on a pane facing ±x. */
export function wiper(b: Builder, x: number, y: number, z: number, dir: 1 | -1, angle = 0.5) {
  b.box(0.012, 0.3, 0.018, 0x111214, x + dir * 0.006, y, z).rotation.x = dir * angle;
}

/** Row of mushroom roof vents along the crown. */
export function roofVents(
  b: Builder,
  x0: number,
  x1: number,
  n: number,
  y: number,
  color = 0x3a3f46,
) {
  for (let i = 0; i < n; i++) {
    const x = x0 + ((i + 0.5) * (x1 - x0)) / n;
    b.add(new CylinderGeometry(0.07, 0.05, 0.04, 8), b.mat(color, STEEL), x, y + 0.03, 0);
    b.add(new CylinderGeometry(0.03, 0.03, 0.04, 6), b.mat(color, STEEL), x, y, 0);
  }
}

/** Boarding step hanging below a door on both sides. */
export function step(b: Builder, x: number, w = 0.32) {
  for (const z of [-0.86, 0.86]) b.box(w, 0.04, 0.16, 0x23272b, x, 1.0, z, STEEL);
  for (const z of [-0.93, 0.93]) b.box(0.03, 0.22, 0.03, 0x23272b, x, 1.1, z, STEEL);
}

/** Louvred grille on both sides (dark backing with raised slats), on a vertical side. */
export function louvres(
  b: Builder,
  x: number,
  y: number,
  w: number,
  h: number,
  slats: number,
  vertical: boolean,
  frame = 0x1f2327,
  slat = 0x5a6068,
) {
  b.box(w, h, HW * 2 + 0.012, frame, x, y, 0, { roughness: 0.8 });
  for (let i = 0; i < slats; i++) {
    const t = (i + 0.5) / slats - 0.5;
    if (vertical) b.box(0.025, h * 0.88, HW * 2 + 0.026, slat, x + t * w, y, 0, { roughness: 0.6 });
    else b.box(w * 0.92, 0.022, HW * 2 + 0.026, slat, x, y + t * h, 0, { roughness: 0.6 });
  }
}

/** Sprung buffers and a screw coupling at one end (dir = +1 front, -1 rear). */
export function buffers(b: Builder, x: number, dir: 1 | -1, y = 1.1, color = DARK) {
  for (const z of [-0.62, 0.62]) {
    b.barrel(0.07, 0.22, color, x + dir * 0.11, y, z, 8);
    b.barrel(0.13, 0.04, color, x + dir * 0.23, y, z, 8);
  }
  b.box(0.18, 0.12, 0.12, 0x1a1c1f, x + dir * 0.12, y - 0.05, 0);
  b.box(0.05, 0.22, 0.05, 0x1a1c1f, x + dir * 0.22, y - 0.18, 0);
}

/** Vertical grab handle on both sides of the body. */
export function handrail(b: Builder, x: number, y0: number, y1: number, hw = HW) {
  b.box(0.03, y1 - y0, hw * 2 + 0.07, 0xc9ccd0, x, (y0 + y1) / 2, 0, {
    roughness: 0.3,
    metalness: 0.7,
  });
}

/** Underframe equipment boxes and an air tank between the bogies. */
export function underframe(b: Builder, x0: number, x1: number, seed = 0) {
  const len = x1 - x0;
  const boxes = Math.max(3, Math.round(len / 1.1));
  for (let i = 0; i < boxes; i++) {
    const w = (len / boxes) * (0.55 + ((i + seed) % 2) * 0.3);
    const cx = x0 + (len / boxes) * (i + 0.5);
    const h = 0.26 + ((i + seed) % 3) * 0.06;
    b.box(w, h, 1.3 - ((i + seed) % 2) * 0.2, i % 2 ? 0x30343a : DARK, cx, BASE - h / 2, 0);
  }
  b.barrel(0.1, len * 0.4, 0x3a3e44, (x0 + x1) / 2, 0.98, 0.5, 8);
}

/** Gangway bellows and a coupler at one end (dir = +1 front, -1 rear). */
export function gangway(b: Builder, x: number, dir: 1 | -1, color = 0x1f2226) {
  b.box(0.14, 1.4, 1.1, color, x + dir * 0.06, 2.1, 0, { roughness: 0.9 });
  if (color !== 0x1f2226)
    for (let i = 0; i < 5; i++) b.box(0.15, 1.42, 0.02, 0x3a3e44, x + dir * 0.06, 2.1, -0.4 + i * 0.2);
  b.box(0.22, 0.16, 0.3, DARK, x + dir * 0.09, 1.08, 0, STEEL);
}

/** Small emissive lamp facing along x. */
export function lamp(b: Builder, x: number, y: number, z: number, color = LAMP, size = 0.1) {
  b.barrel(size * 0.6, 0.04, color, x, y, z, 10, { emissive: color, emissiveIntensity: 3 });
}
