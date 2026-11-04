/**
 * Low-poly terrain: a jittered, flat-shaded heightmap with trees and rocks baked into each chunk's
 * mesh (one draw call per chunk). Pure TS + three.js geometry helpers (no DOM), so it runs in the
 * chunk workers. The land is flattened along the railway so the track always sits on a tidy bed.
 */
import {
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  IcosahedronGeometry,
  Matrix4,
  Quaternion,
  Vector3,
} from "three";
import { createNoise2D, type NoiseFunction2D } from "simplex-noise";
import { hash3f, mulberry32 } from "@/lib/rng";
import { smoothstep } from "@/lib/math";
import { Route, SEA_LEVEL } from "@/game/simulation/route";
import { seasonAt } from "@/game/content/seasons";
import { PALETTE, SEASON_COLORS, jitterColor } from "./seasonPalette";
import {
  COVER_MIN,
  TUNNEL_WALL,
  TunnelPlan,
  portalCap,
  tunnelProfile,
  type Tunnel,
} from "./tunnels";
import { buildTunnels } from "./tunnelMesh";

export const CHUNK_SIZE = 32;
const CELL = 2;
const CELLS = CHUNK_SIZE / CELL;
/** Half-width of the perfectly flat track bed, and where natural terrain fully takes over. */
const BED_HALF_WIDTH = 3.5;
const BLEND_END = 15;
/** Props stay clear of the line (and the station buildings beside it). */
const PROP_CLEARANCE = 10;

export class TerrainField {
  readonly route: Route;
  readonly tunnels: TunnelPlan;
  private readonly hills: NoiseFunction2D;
  private readonly detail: NoiseFunction2D;
  private readonly lakes: NoiseFunction2D;

  constructor(readonly seed: number) {
    this.route = new Route(seed);
    this.tunnels = new TunnelPlan(this.route, seed);
    this.hills = createNoise2D(mulberry32(seed));
    this.detail = createNoise2D(mulberry32(seed ^ 0x5bd1e995));
    this.lakes = createNoise2D(mulberry32(seed ^ 0x1b873593));
  }

  /** Approximate horizontal distance to the railway (exact enough for gentle curves). */
  distanceToRoute(x: number, z: number): number {
    return Math.abs(z - this.route.z(x));
  }

  naturalHeight(x: number, z: number): number {
    const broad = this.hills(x * 0.01, z * 0.01);
    const fine = this.detail(x * 0.05, z * 0.05);
    const lake = Math.min(0, this.lakes(x * 0.016, z * 0.016) + 0.3) * 12;
    const ridge = Math.max(0, this.hills(x * 0.004 + 50, z * 0.004)) ** 2 * 18;
    return 15 + broad * 6 + fine * 1.3 + lake + ridge;
  }

  /** Natural land plus the hill raised over a tunnel. */
  landHeight(x: number, z: number, tunnel: Tunnel | null = this.tunnels.near(x)): number {
    const h = this.naturalHeight(x, z);
    if (!tunnel) return h;
    const k = tunnelProfile(tunnel, x) * (1 - smoothstep(8, 40, this.distanceToRoute(x, z)));
    const hill =
      this.route.y(x) +
      Math.min(portalCap(tunnel, x), tunnel.rise * k + this.detail(x * 0.08, z * 0.08) * 1.5 * k);
    return Math.max(h, hill);
  }

  heightAt(x: number, z: number): number {
    const bed = this.route.y(x) - 0.35;
    const tunnel = this.tunnels.near(x);
    // Near a tunnel the cutting narrows into steep walls leading to the portal.
    const cut = tunnel ? tunnelProfile(tunnel, x) : 0;
    const blendEnd = BLEND_END + (TUNNEL_WALL - BLEND_END) * cut;
    const t = smoothstep(BED_HALF_WIDTH, blendEnd, this.distanceToRoute(x, z));
    return bed + (this.landHeight(x, z, tunnel) - bed) * t;
  }

  /** On the track bed under a tunnel roof. */
  inTunnel(x: number, z: number): boolean {
    const t = this.tunnels.near(x);
    return !!t && x >= t.x0 && x <= t.x1 && this.distanceToRoute(x, z) < BED_HALF_WIDTH + 1;
  }

  /** Vertex jitter keyed on the global grid index, so shared chunk edges match exactly. */
  vertex(gx: number, gz: number, cover = false): [number, number, number] {
    const jx = (hash3f(gx, 0, gz, this.seed) - 0.5) * CELL * 0.6;
    const jz = (hash3f(gx, 1, gz, this.seed) - 0.5) * CELL * 0.6;
    const x = gx * CELL + jx;
    const z = gz * CELL + jz;
    return [x, cover ? this.coverHeight(x, z) : this.heightAt(x, z), z];
  }

  /** The hill as if no cutting ran through it: the surface over a tunnel. */
  coverHeight(x: number, z: number): number {
    if (this.distanceToRoute(x, z) >= TUNNEL_WALL) return this.heightAt(x, z);
    const bed = this.route.y(x) - 0.35;
    const t = this.tunnels.near(x);
    const cap = t ? bed + portalCap(t, x) : Infinity;
    return Math.max(Math.min(this.landHeight(x, z, t), cap), bed + COVER_MIN);
  }

  /** The tunnel whose hill covers grid column gx (cells between the portals), if any. */
  coverTunnel(gx: number): Tunnel | null {
    const x = (gx + 0.5) * CELL;
    const t = this.tunnels.near(x);
    return t && x > t.x0 && x < t.x1 ? t : null;
  }
}

export interface TerrainChunkData {
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
}

/** Growable flat-shaded triangle soup. */
export class Soup {
  pos: number[] = [];
  nrm: number[] = [];
  col: number[] = [];
  private a = new Vector3();
  private b = new Vector3();
  private c = new Vector3();
  private n = new Vector3();
  private d = new Vector3();
  private v = new Vector3();
  private tri3: number[][] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];

  tri(p0: ArrayLike<number>, p1: ArrayLike<number>, p2: ArrayLike<number>, color: Color) {
    this.a.fromArray(p0 as number[]);
    this.b.fromArray(p1 as number[]);
    this.c.fromArray(p2 as number[]);
    // Counter-clockwise front faces: n = (b - a) × (c - a).
    this.n.subVectors(this.b, this.a).cross(this.d.subVectors(this.c, this.a)).normalize();
    for (const p of [this.a, this.b, this.c]) {
      this.pos.push(p.x, p.y, p.z);
      this.nrm.push(this.n.x, this.n.y, this.n.z);
      this.col.push(color.r, color.g, color.b);
    }
  }

  /** Append a non-indexed template geometry transformed by `m`, in one colour. */
  geometry(g: BufferGeometry, m: Matrix4, color: Color) {
    const p = g.attributes.position;
    const tri = this.tri3;
    for (let i = 0; i < p.count; i++) {
      this.v.fromBufferAttribute(p, i).applyMatrix4(m);
      this.v.toArray(tri[i % 3]);
      if (i % 3 === 2) this.tri(tri[0], tri[1], tri[2], color);
    }
  }

  build(): TerrainChunkData {
    return {
      positions: new Float32Array(this.pos),
      normals: new Float32Array(this.nrm),
      colors: new Float32Array(this.col),
    };
  }
}

let templates: Record<"trunk" | "blob" | "cone" | "rock" | "bush", BufferGeometry> | null = null;
function getTemplates() {
  templates ??= {
    trunk: new CylinderGeometry(0.16, 0.22, 1.4, 5).translate(0, 0.7, 0).toNonIndexed(),
    blob: new IcosahedronGeometry(1, 0).toNonIndexed(),
    cone: new ConeGeometry(1, 1.6, 6).toNonIndexed(),
    rock: new DodecahedronGeometry(0.7, 0).toNonIndexed(),
    bush: new IcosahedronGeometry(0.55, 0).toNonIndexed(),
  };
  return templates;
}

export function buildTerrainChunk(field: TerrainField, cx: number, cz: number): TerrainChunkData {
  const soup = new Soup();
  const gx0 = cx * CELLS;
  const gz0 = cz * CELLS;
  const verts: [number, number, number][] = [];
  for (let j = 0; j <= CELLS; j++)
    for (let i = 0; i <= CELLS; i++) verts.push(field.vertex(gx0 + i, gz0 + j));
  const at = (i: number, j: number) => verts[j * (CELLS + 1) + i];

  const faceColor = (a: number[], b: number[], c: number[], salt: number, cover = false): Color => {
    const h = (a[1] + b[1] + c[1]) / 3;
    const x = (a[0] + b[0] + c[0]) / 3;
    const z = (a[2] + b[2] + c[2]) / 3;
    // Slope from the triangle's normal.
    const ux = b[0] - a[0],
      uy = b[1] - a[1],
      uz = b[2] - a[2];
    const vx = c[0] - a[0],
      vy = c[1] - a[1],
      vz = c[2] - a[2];
    const nx = uy * vz - uz * vy,
      ny = uz * vx - ux * vz,
      nz = ux * vy - uy * vx;
    const up = Math.abs(ny) / Math.hypot(nx, ny, nz);
    const k = hash3f(Math.floor(x * 3), salt, Math.floor(z * 3), field.seed);
    const season = seasonAt(x, hash3f(Math.floor(x / 4), 11, Math.floor(z / 4), field.seed));
    if (h < SEA_LEVEL - 0.4) return jitterColor(PALETTE.wetSand, k);
    if (h < SEA_LEVEL + 0.7) return jitterColor(PALETTE.sand, k);
    if (h > 33) return jitterColor(PALETTE.snow, k);
    if (!cover && field.inTunnel(x, z)) return jitterColor(PALETTE.tunnel, k);
    if (up < 0.72) return jitterColor(k > 0.5 ? PALETTE.rock : PALETTE.darkRock, k);
    if (h > 26) return jitterColor(season === "winter" ? PALETTE.snow : PALETTE.rock, k);
    const ground = SEASON_COLORS[season];
    const meadow = field.distanceToRoute(x, z) > 30 && k > 0.85;
    return jitterColor(
      meadow ? ground.meadow : ground.grass[Math.floor(k * 4) % 4],
      hash3f(x, 7, z),
    );
  };

  // Over a tunnel the hill continues across the cutting, on the same grid as the land around it.
  const coverCell = (i: number, j: number, flip: boolean) => {
    const v = (di: number, dj: number) => field.vertex(gx0 + i + di, gz0 + j + dj, true);
    const near = (p: number[]) => field.distanceToRoute(p[0], p[2]) < TUNNEL_WALL;
    const [c00, c10, c01, c11] = [v(0, 0), v(1, 0), v(0, 1), v(1, 1)];
    const tris = flip
      ? [
          [c00, c01, c10],
          [c10, c01, c11],
        ]
      : [
          [c00, c01, c11],
          [c00, c11, c10],
        ];
    tris.forEach(([a, b, c], n) => {
      // Triangles clear of the cutting are already the land itself.
      if (near(a) || near(b) || near(c)) soup.tri(a, b, c, faceColor(a, b, c, n + 1, true));
    });
  };

  for (let j = 0; j < CELLS; j++)
    for (let i = 0; i < CELLS; i++) {
      const p00 = at(i, j),
        p10 = at(i + 1, j),
        p01 = at(i, j + 1),
        p11 = at(i + 1, j + 1);
      // Alternate the diagonal pseudo-randomly for a more organic facet pattern.
      const flip = hash3f(gx0 + i, 2, gz0 + j, field.seed) < 0.5;
      if (flip) {
        soup.tri(p00, p01, p10, faceColor(p00, p01, p10, 1));
        soup.tri(p10, p01, p11, faceColor(p10, p01, p11, 2));
      } else {
        soup.tri(p00, p01, p11, faceColor(p00, p01, p11, 1));
        soup.tri(p00, p11, p10, faceColor(p00, p11, p10, 2));
      }
      if (field.coverTunnel(gx0 + i)) coverCell(i, j, flip);
    }

  placeProps(field, soup, cx, cz);
  buildTunnels(
    field,
    soup,
    cx * CHUNK_SIZE,
    (cx + 1) * CHUNK_SIZE,
    cz * CHUNK_SIZE,
    (cz + 1) * CHUNK_SIZE,
  );
  return soup.build();
}

function placeProps(field: TerrainField, soup: Soup, cx: number, cz: number) {
  const t = getTemplates();
  const snowy = new Color();
  const m = new Matrix4();
  const q = new Quaternion();
  const s = new Vector3();
  const p = new Vector3();
  const up = new Vector3(0, 1, 0);
  const STEP = 3;
  const n = CHUNK_SIZE / STEP;
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const gx = cx * n + i;
      const gz = cz * n + j;
      const r = (k: number) => hash3f(gx, 10 + k, gz, field.seed);
      const x = cx * CHUNK_SIZE + (i + 0.15 + r(0) * 0.7) * STEP;
      const z = cz * CHUNK_SIZE + (j + 0.15 + r(1) * 0.7) * STEP;
      if (field.distanceToRoute(x, z) < PROP_CLEARANCE) continue;
      const h = field.heightAt(x, z);
      if (h < SEA_LEVEL + 1) continue;
      // Slope check: skip steep ground.
      if (Math.abs(field.heightAt(x + 1, z) - h) + Math.abs(field.heightAt(x, z + 1) - h) > 1.6)
        continue;
      const forest = field.naturalHeight(x * 0.7 + 300, z * 0.7) > 17 ? 0.45 : 0.1;
      const roll = r(2);
      const rot = r(3) * Math.PI * 2;
      const scale = 0.8 + r(4) * 0.6;
      const season = seasonAt(x, r(12));
      const colors = SEASON_COLORS[season];
      q.setFromAxisAngle(up, rot);

      if (roll < forest) {
        const pine = h > 22 || r(5) < 0.35;
        // Trunk
        m.compose(p.set(x, h - 0.1, z), q, s.set(scale, scale, scale));
        soup.geometry(t.trunk, m, PALETTE.trunk);
        if (pine) {
          const col = PALETTE.pine[Math.floor(r(6) * 3)];
          // Winter: snow-dusted lower tier, white tip.
          const lower = season === "winter" ? snowy.copy(col).lerp(PALETTE.snow, 0.55) : col;
          const upper = season === "winter" ? PALETTE.snow : col;
          m.compose(p.set(x, h + 1.6 * scale, z), q, s.set(scale * 1.2, scale * 1.2, scale * 1.2));
          soup.geometry(t.cone, m, jitterColor(lower, r(7)));
          m.compose(
            p.set(x, h + 2.6 * scale, z),
            q,
            s.set(scale * 0.85, scale * 1.0, scale * 0.85),
          );
          soup.geometry(t.cone, m, jitterColor(upper, r(8)));
        } else {
          const col =
            season === "spring" && r(9) < 0.1
              ? PALETTE.autumn[Math.floor(r(6) * PALETTE.autumn.length)]
              : colors.leaves[Math.floor(r(6) * 4)];
          m.compose(
            p.set(x, h + 1.9 * scale, z),
            q,
            s.set(scale * 1.15, scale * 1.0, scale * 1.15),
          );
          soup.geometry(t.blob, m, jitterColor(col, r(7)));
        }
      } else if (roll < forest + 0.06) {
        m.compose(p.set(x, h + 0.2, z), q, s.set(scale, scale * 0.6, scale * 0.9));
        soup.geometry(t.rock, m, jitterColor(PALETTE.rock, r(7)));
      } else if (roll < forest + 0.14) {
        m.compose(p.set(x, h + 0.25, z), q, s.set(scale, scale * 0.7, scale));
        soup.geometry(t.bush, m, jitterColor(colors.bush[Math.floor(r(6) * 4)], r(7)));
      }
    }
}
