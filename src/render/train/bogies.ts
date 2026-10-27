/**
 * Bogie types for the Depot trains. Each is built around the same wheelsets but with its own
 * frame, suspension and brake gear, so loco and coach running gear read differently.
 */
import { CylinderGeometry } from "three";
import type { Builder } from "./trainModels";

const STEEL = { roughness: 0.6, metalness: 0.35 };
const FRAME = 0x2b2f34;
const FRAME_LIGHT = 0x3d4249;
const SPRING = 0x55595f;
/** Plane of the side frames (just outside the wheels). */
const Z = 0.88;

export type BogieType = "cp1" | "b4";

const sides = [-1, 1] as const;

/** Coil spring as a stack of rings. */
function coil(b: Builder, x: number, y: number, z: number, h: number, r: number, color = SPRING) {
  const turns = Math.max(3, Math.round(h / 0.045));
  const ring = b.mat(color, STEEL);
  for (let i = 0; i < turns; i++)
    b.add(new CylinderGeometry(r, r, 0.024, 8), ring, x, y - h / 2 + ((i + 0.5) * h) / turns, z);
}

/** Side-frame plate from a side profile (relative to the bogie centre), on both sides. */
function plate(b: Builder, x: number, pts: [number, number][], t = 0.08, color = FRAME) {
  for (const s of sides)
    b.prism(
      pts.map(([px, py]) => [x + px, py]),
      t,
      color,
      STEEL,
    ).position.z = s * Z;
}

const axlesAt = (x: number, n: number, spacing: number) =>
  Array.from({ length: n }, (_, i) => x + (i - (n - 1) / 2) * spacing);

/** Tread brake block in front of a wheel. */
function brakeBlock(b: Builder, ax: number, r: number, dir: 1 | -1) {
  for (const s of sides)
    b.box(0.06, 0.18, 0.1, 0x1d1f22, ax + dir * (r + 0.04), r + 0.45, s * 0.72, STEEL);
}

/** `wheel` is the wheel-centre colour. */
export function bogie(b: Builder, x: number, type: BogieType, wheel?: number) {
  if (type === "cp1") {
    // Three-axle loco bogie: deep frame, pedestals, equalising beams with coils, nose-hung motors.
    const r = 0.32;
    const axles = axlesAt(x, 3, 0.78);
    b.box(2.3, 0.14, 1.0, FRAME, x, 1.08, 0, STEEL);
    plate(b, x, [
      [-1.25, 1.14],
      [1.25, 1.14],
      [1.25, 0.96],
      [1.05, 0.92],
      [-1.05, 0.92],
      [-1.25, 0.96],
    ]);
    for (const ax of axles) {
      for (const s of sides) {
        b.box(0.34, 0.3, 0.1, FRAME_LIGHT, ax, 0.82, s * (Z + 0.02), STEEL); // pedestal
        b.box(0.2, 0.18, 0.13, 0x23272b, ax, r + 0.45, s * (Z + 0.05), STEEL); // axlebox
      }
      brakeBlock(b, ax, r, 1);
    }
    for (let i = 0; i < 2; i++) {
      const mid = (axles[i] + axles[i + 1]) / 2;
      for (const s of sides) {
        b.box(0.78, 0.06, 0.07, FRAME, mid, 0.66, s * (Z + 0.06), STEEL); // equaliser
        for (const dx of [-0.12, 0.12]) coil(b, mid + dx, 0.79, s * (Z + 0.06), 0.2, 0.06);
      }
      b.box(0.36, 0.3, 0.9, 0x23272b, mid, 0.78, 0, STEEL); // traction motor
    }
    for (const s of sides) {
      b.box(0.2, 0.16, 0.16, FRAME_LIGHT, x + 1.15, 1.0, s * 0.72, STEEL); // sandbox
      b.box(0.2, 0.16, 0.16, FRAME_LIGHT, x - 1.15, 1.0, s * 0.72, STEEL);
      b.barrel(0.06, 0.24, 0x1d1f22, x - 0.55, 1.0, s * 0.6, 8); // brake cylinder
    }
    for (const dx of [-1.3, 1.3]) b.box(0.05, 0.22, 1.5, FRAME, x + dx, 0.62, 0, STEEL); // lifeguard
    axles.forEach((ax) => b.wheelPair(r, ax, wheel ?? 0x30343a));
    return;
  }
  // Coach bogie: pressed-steel side frame with a dropped centre, coils on the axleboxes.
  const r = 0.3;
  const axles = axlesAt(x, 2, 0.9);
  b.box(0.5, 0.14, 1.45, FRAME, x, 0.94, 0, STEEL); // bolster
  plate(b, x, [
    [-0.9, 1.04],
    [0.9, 1.04],
    [0.9, 0.92],
    [0.55, 0.8],
    [0.32, 0.86],
    [-0.32, 0.86],
    [-0.55, 0.8],
    [-0.9, 0.92],
  ]);
  for (const ax of axles)
    for (const s of sides) {
      b.box(0.2, 0.15, 0.12, 0x23272b, ax, r + 0.45, s * (Z + 0.05), STEEL);
      for (const dx of [-0.07, 0.07]) coil(b, ax + dx, 0.95, s * (Z + 0.05), 0.12, 0.045);
    }
  for (const s of sides) for (const dx of [-0.16, 0.16]) coil(b, x + dx, 1.07, s * 0.62, 0.14, 0.08);
  axles.forEach((ax, i) => {
    brakeBlock(b, ax, r, i === 0 ? -1 : 1);
    b.wheelPair(r, ax, wheel ?? 0x3a3e44);
  });
}
