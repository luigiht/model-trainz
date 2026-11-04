/**
 * Tunnels: from station TUNNEL_FROM_STATION on, some legs get a hill raised over their middle and
 * the line runs through it. Placed per leg so they never overlap a platform. Pure TS (no three).
 */
import { hash3f } from "@/lib/rng";
import { smoothstep } from "@/lib/math";
import type { Route } from "@/game/simulation/route";
import { stationS } from "@/game/simulation/rules";
import { MAX_PLATFORM_LENGTH } from "./stationModel";

export const TUNNEL_FROM_STATION = 10;
const TUNNEL_CHANCE = 0.5;
/** Clear track kept beside each platform before the hill starts rising. */
const STATION_MARGIN = 4;
/** Arc length over which the hill rises from flat land to full height at a portal. */
const RAMP = 10;
/** The land's cutting walls finish rising by TUNNEL_WALL from the line. */
export const TUNNEL_WALL = 6;
/** The hill over a tunnel is never lower than this above the track bed (the tube is 4.8 tall). */
export const COVER_MIN = 6.5;
/** Portal facade height above the bed; the hill rises from it at PORTAL_SLOPE going inward. */
export const PORTAL_TOP = 7.2;
const PORTAL_SLOPE = 0.6;
/** Portals sit on terrain grid lines (terrain CELL = 2) so the hill cover starts flush with them. */
const GRID = 2;

export interface Tunnel {
  /** World x where the hill starts / ends. */
  start: number;
  end: number;
  /** World x of the entry and exit portals. */
  x0: number;
  x1: number;
  /** Hill height above the track bed. */
  rise: number;
}

export class TunnelPlan {
  private readonly list: Tunnel[] = [];
  private nextLeg = TUNNEL_FROM_STATION;
  private coveredTo: number;

  constructor(
    private readonly route: Route,
    private readonly seed: number,
  ) {
    this.coveredTo = route.xAt(stationS(TUNNEL_FROM_STATION));
  }

  private extend(x: number) {
    while (this.coveredTo < x) {
      const k = this.nextLeg++;
      this.coveredTo = this.route.xAt(stationS(k + 1));
      if (hash3f(k, 0, 0, this.seed ^ 0x7e11a5) >= TUNNEL_CHANCE) continue;
      const a = stationS(k) + STATION_MARGIN;
      const b = stationS(k + 1) - MAX_PLATFORM_LENGTH - STATION_MARGIN;
      if (b - a < 2 * RAMP + 12) continue;
      this.list.push({
        start: this.route.xAt(a),
        x0: Math.ceil(this.route.xAt(a + RAMP) / GRID) * GRID,
        x1: Math.floor(this.route.xAt(b - RAMP) / GRID) * GRID,
        end: this.route.xAt(b),
        rise: 8 + hash3f(k, 1, 0, this.seed ^ 0x7e11a5) * 4,
      });
    }
  }

  /** The tunnel whose hill covers world x, if any. */
  near(x: number): Tunnel | null {
    this.extend(x);
    const l = this.list;
    let lo = 0;
    let hi = l.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (l[mid].end < x) lo = mid + 1;
      else if (l[mid].start > x) hi = mid - 1;
      else return l[mid];
    }
    return null;
  }

  /** Tunnels whose hill overlaps [xa, xb). */
  between(xa: number, xb: number): Tunnel[] {
    this.extend(xb);
    return this.list.filter((t) => t.end >= xa && t.start < xb);
  }
}

/** 0 on open land, rising to 1 between the portals. */
export function tunnelProfile(t: Tunnel, x: number): number {
  return smoothstep(t.start, t.x0, x) * (1 - smoothstep(t.x1, t.end, x));
}

/** Highest the raised hill may be above the bed at x, so it meets the portal facades' tops. */
export function portalCap(t: Tunnel, x: number): number {
  return PORTAL_TOP + PORTAL_SLOPE * Math.max(0, Math.min(x - t.x0, t.x1 - x));
}
