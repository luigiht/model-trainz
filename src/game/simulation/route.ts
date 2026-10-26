/**
 * The railway route: a gentle analytic curve z(x), y(x) seeded per world, parameterised by arc
 * length s. Pure TS — used by the simulation, the renderer and terrain workers (which only need
 * routeZ/routeY to flatten the land around the line).
 */
import { mulberry32 } from "@/lib/rng";

export const SEA_LEVEL = 9;

export interface RoutePoint {
  x: number;
  y: number;
  z: number;
  /** Unit forward direction. */
  dx: number;
  dy: number;
  dz: number;
}

export class Route {
  private readonly p: number[];
  /** Cumulative arc length at x = i * STEP. */
  private table = new Float64Array(4096);
  private tableLen = 1;
  private static readonly STEP = 0.5;

  constructor(readonly seed: number) {
    const r = mulberry32(seed ^ 0x2545f491);
    this.p = Array.from({ length: 6 }, () => r() * Math.PI * 2);
  }

  z(x: number): number {
    const p = this.p;
    return (
      16 * Math.sin(x * 0.011 + p[0]) +
      8 * Math.sin(x * 0.026 + p[1]) +
      2.5 * Math.sin(x * 0.05 + p[2]) -
      16 * Math.sin(p[0]) -
      8 * Math.sin(p[1]) -
      2.5 * Math.sin(p[2])
    );
  }

  dzdx(x: number): number {
    const p = this.p;
    return (
      16 * 0.011 * Math.cos(x * 0.011 + p[0]) +
      8 * 0.026 * Math.cos(x * 0.026 + p[1]) +
      2.5 * 0.05 * Math.cos(x * 0.05 + p[2])
    );
  }

  /** Track-bed height: smooth, always above sea level. */
  y(x: number): number {
    const p = this.p;
    return 15 + 3.5 * Math.sin(x * 0.006 + p[3]) + 1.5 * Math.sin(x * 0.017 + p[4]);
  }

  dydx(x: number): number {
    const p = this.p;
    return 3.5 * 0.006 * Math.cos(x * 0.006 + p[3]) + 1.5 * 0.017 * Math.cos(x * 0.017 + p[4]);
  }

  private ensure(s: number) {
    const STEP = Route.STEP;
    while (this.table[this.tableLen - 1] < s + 1) {
      if (this.tableLen === this.table.length) {
        const next = new Float64Array(this.table.length * 2);
        next.set(this.table);
        this.table = next;
      }
      const i = this.tableLen;
      const xm = (i - 0.5) * STEP;
      const dz = this.dzdx(xm);
      const dy = this.dydx(xm);
      this.table[i] = this.table[i - 1] + STEP * Math.sqrt(1 + dz * dz + dy * dy);
      this.tableLen++;
    }
  }

  /** x coordinate at arc length s (s >= 0). */
  xAt(s: number): number {
    s = Math.max(0, s);
    this.ensure(s);
    // Arc length ≈ x (gentle curve), so start the search near s / STEP.
    let i = Math.min(this.tableLen - 2, Math.floor(s / Route.STEP));
    while (i > 0 && this.table[i] > s) i--;
    while (i < this.tableLen - 2 && this.table[i + 1] < s) i++;
    const a = this.table[i];
    const b = this.table[i + 1];
    return (i + (b > a ? (s - a) / (b - a) : 0)) * Route.STEP;
  }

  pointAt(s: number, out: RoutePoint = { x: 0, y: 0, z: 0, dx: 1, dy: 0, dz: 0 }): RoutePoint {
    const x = this.xAt(s);
    const dz = this.dzdx(x);
    const dy = this.dydx(x);
    const len = Math.sqrt(1 + dz * dz + dy * dy);
    out.x = x;
    out.y = this.y(x);
    out.z = this.z(x);
    out.dx = 1 / len;
    out.dy = dy / len;
    out.dz = dz / len;
    return out;
  }
}
