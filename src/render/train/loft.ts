/**
 * Lofted, painted bodies: a cross-section profile skinned through stations along x, with each flat
 * face coloured by a livery rule. Gives curved sides, rounded roofs and tapered noses in a single
 * low-poly mesh, and flush windows/stripes that follow the shape.
 */
import { BufferAttribute, BufferGeometry, Color } from "three";
import type { Builder } from "./trainModels";

/** Right half of a cross-section: [halfWidth, y] from the floor up to the roof. y ascending. */
export type Profile = [number, number][];

/** A ring of the loft: full profile at `x`, scaled in width (`w`) and height above the base (`h`). */
export interface Station {
  x: number;
  w?: number;
  h?: number;
}

export interface Face {
  x: number;
  y: number;
  z: number;
  nx: number;
  ny: number;
  nz: number;
}

/** Face colour; `null` leaves the face out (e.g. glazing built as a separate see-through loft). */
export type Paint = (f: Face) => number | null;

/** Insert interpolated breakpoints so faces (and therefore colours) can change at these heights. */
export function withBreaks(profile: Profile, ys: number[]): Profile {
  const out = [...profile];
  for (const y of ys) {
    if (out.some(([, py]) => Math.abs(py - y) < 1e-4)) continue;
    const i = out.findIndex(([, py]) => py > y);
    if (i <= 0) continue;
    const [w0, y0] = out[i - 1];
    const [w1, y1] = out[i];
    const t = (y - y0) / (y1 - y0);
    out.splice(i, 0, [w0 + (w1 - w0) * t, y]);
  }
  return out;
}

/** Stations along a straight body, with extra cuts (window/door edges) and softly tapered ends. */
export function bodyStations(x0: number, x1: number, cuts: number[], taper = 0.18): Station[] {
  const inner = [...new Set(cuts.filter((c) => c > x0 + taper && c < x1 - taper))].sort(
    (a, b) => a - b,
  );
  return [
    { x: x0, w: 0.94, h: 0.975 },
    { x: x0 + taper },
    ...inner.map((x) => ({ x })),
    { x: x1 - taper },
    { x: x1, w: 0.94, h: 0.975 },
  ];
}

export const within = (v: number, ranges: [number, number][]) =>
  ranges.some(([a, b]) => v > a && v < b);

const tmp = new Color();

/** Skin `profile` through `stations` (ascending x), closing both ends with caps. */
export function loft(
  b: Builder,
  profile: Profile,
  stations: Station[],
  paint: Paint,
  opts?: Parameters<Builder["paintMat"]>[0],
  look?: Parameters<Builder["paintMat"]>[1],
) {
  const base = profile[0][1];
  const rings = stations.map(({ x, w = 1, h = 1 }) => {
    const right = profile.map(([hw, y]) => [hw * w, base + (y - base) * h] as const);
    const left = [...right].reverse().map(([z, y]) => [-z, y] as const);
    return { x, h, pts: [...right, ...left] };
  });
  const pos: number[] = [];
  const nor: number[] = [];
  const col: number[] = [];
  const cy = (profile[0][1] + profile[profile.length - 1][1]) / 2;

  const tri = (
    a: number[],
    c: number[],
    d: number[],
    outward: (n: number[], m: number[]) => boolean,
    preset?: number,
  ) => {
    const u = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const v = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
    let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const len = Math.hypot(n[0], n[1], n[2]);
    if (len < 1e-9) return;
    n = n.map((k) => k / len);
    const m = [(a[0] + c[0] + d[0]) / 3, (a[1] + c[1] + d[1]) / 3, (a[2] + c[2] + d[2]) / 3];
    let verts = [a, c, d];
    if (!outward(n, m)) {
      verts = [a, d, c];
      n = n.map((k) => -k);
    }
    const colour =
      preset ?? paint({ x: m[0], y: m[1], z: m[2], nx: n[0], ny: n[1], nz: n[2] });
    if (colour === null) return;
    tmp.setHex(colour);
    for (const p of verts) {
      pos.push(p[0], p[1], p[2]);
      nor.push(n[0], n[1], n[2]);
      col.push(tmp.r, tmp.g, tmp.b);
    }
  };
  // Sides point away from the body axis (in the y-z plane); the axis drops with scaled rings.
  const outward = (axisY: number) => (n: number[], m: number[]) =>
    n[1] * (m[1] - axisY) + n[2] * m[2] >= 0;

  for (let s = 0; s < rings.length - 1; s++) {
    const A = rings[s];
    const B = rings[s + 1];
    const sideOut = outward(base + (cy - base) * ((A.h + B.h) / 2));
    const k = A.pts.length;
    for (let i = 0; i < k; i++) {
      const j = (i + 1) % k;
      const a0 = [A.x, A.pts[i][1], A.pts[i][0]];
      const a1 = [A.x, A.pts[j][1], A.pts[j][0]];
      const b0 = [B.x, B.pts[i][1], B.pts[i][0]];
      const b1 = [B.x, B.pts[j][1], B.pts[j][0]];
      // One colour per quad, sampled at its centre with the averaged outward normal.
      const m = [0, 1, 2].map((k) => (a0[k] + a1[k] + b0[k] + b1[k]) / 4);
      const d1 = [b1[0] - a0[0], b1[1] - a0[1], b1[2] - a0[2]];
      const d2 = [a1[0] - b0[0], a1[1] - b0[1], a1[2] - b0[2]];
      let n = [
        d1[1] * d2[2] - d1[2] * d2[1],
        d1[2] * d2[0] - d1[0] * d2[2],
        d1[0] * d2[1] - d1[1] * d2[0],
      ];
      const len = Math.hypot(n[0], n[1], n[2]) || 1;
      n = n.map((k) => k / len);
      if (!sideOut(n, m)) n = n.map((k) => -k);
      const colour = paint({ x: m[0], y: m[1], z: m[2], nx: n[0], ny: n[1], nz: n[2] });
      if (colour === null) continue;
      tri(a0, a1, b1, sideOut, colour);
      tri(a0, b1, b0, sideOut, colour);
    }
  }
  // End caps as horizontal strips (so banded liveries stay level), facing -x first and +x last.
  const rows = profile.length;
  for (const [ring, dir] of [
    [rings[0], -1],
    [rings[rings.length - 1], 1],
  ] as const) {
    const at = (i: number) => [ring.x, ring.pts[i][1], ring.pts[i][0]];
    for (let i = 0; i < rows - 1; i++) {
      const r0 = at(i);
      const r1 = at(i + 1);
      const l0 = at(2 * rows - 1 - i);
      const l1 = at(2 * rows - 2 - i);
      const facing = (nv: number[]) => nv[0] * dir > 0;
      tri(r0, r1, l1, facing);
      tri(r0, l1, l0, facing);
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute("normal", new BufferAttribute(new Float32Array(nor), 3));
  geo.setAttribute("color", new BufferAttribute(new Float32Array(col), 3));
  return b.add(geo, b.paintMat(opts, look), 0, 0, 0);
}
