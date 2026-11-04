/**
 * Tunnel geometry baked into terrain chunks: a stone-lined arched tube under the hill (the hill
 * itself is the terrain's cover, see `buildTerrainChunk`) and a dressed-stone portal at each end.
 */
import {
  BoxGeometry,
  Color,
  ExtrudeGeometry,
  Matrix4,
  Shape,
  Vector3,
  type BufferGeometry,
} from "three";
import { seasonAt } from "@/game/content/seasons";
import { hash3f } from "@/lib/rng";
import { PALETTE, SEASON_COLORS, jitterColor } from "./seasonPalette";
import type { Soup, TerrainField } from "./terrain";
import { PORTAL_TOP, type Tunnel } from "./tunnels";

/** Tube cross-section: straight side walls, then a semicircular vault (crown at 4.8). */
const TUBE_HALF_WIDTH = 2.4;
const TUBE_WALL = 2.4;
const TUBE_FLOOR = -0.3;
const ARCH_SEGMENTS = 8;
const TUBE_STEP = 1.5;
const RIB_SPACING = 6;
const RIB_INSET = 0.22;
const RIB_LENGTH = 0.6;
/** Portal facade half-width and thickness (FACADE_INSIDE of it reaches under the hill). */
const FACADE_HALF_WIDTH = 8.5;
const FACADE_DEPTH = 1.8;
const FACADE_INSIDE = 0.8;
const RING_WIDTH = 0.7;

const UP = new Vector3(0, 1, 0);
const tint = new Color();

type Ring = [number, number][];

/** Arch outline in (across, up): left foot, over the crown, right foot. */
function archProfile(halfWidth: number): Ring {
  const pts: Ring = [
    [-halfWidth, TUBE_FLOOR],
    [-halfWidth, TUBE_WALL],
  ];
  for (let i = 1; i < ARCH_SEGMENTS; i++) {
    const a = Math.PI * (1 - i / ARCH_SEGMENTS);
    pts.push([Math.cos(a) * halfWidth, TUBE_WALL + Math.sin(a) * halfWidth]);
  }
  pts.push([halfWidth, TUBE_WALL], [halfWidth, TUBE_FLOOR]);
  return pts;
}

/** Track-aligned frame at world x: bed-level origin and horizontal forward/side axes. */
function frameAt(field: TerrainField, x: number) {
  const fwd = new Vector3(1, 0, field.route.dzdx(x)).normalize();
  const side = new Vector3().crossVectors(fwd, UP);
  const origin = new Vector3(x, field.route.y(x) - 0.35, field.route.z(x));
  return { fwd, side, origin };
}

/** Append a template with a per-quad stone tint, so flat faces read as dressed blocks. */
function stone(
  soup: Soup,
  field: TerrainField,
  g: BufferGeometry,
  m: Matrix4,
  base: Color,
  salt: number,
) {
  const src = g.index ? g.toNonIndexed() : g;
  const p = src.attributes.position;
  const v = new Vector3();
  const tri: number[][] = [[], [], []];
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i)
      .applyMatrix4(m)
      .toArray(tri[i % 3]);
    if (i % 3 === 2) {
      const k = hash3f(Math.floor(i / 6), salt, 0, field.seed);
      soup.tri(tri[0], tri[1], tri[2], tint.copy(base).multiplyScalar(0.85 + k * 0.3));
    }
  }
  if (src !== g) src.dispose();
}

function groundColor(field: TerrainField, x: number, z: number): Color {
  const k = hash3f(Math.floor(x * 3), 5, Math.floor(z * 3), field.seed);
  const season = seasonAt(x, hash3f(Math.floor(x / 4), 11, Math.floor(z / 4), field.seed));
  return jitterColor(SEASON_COLORS[season].grass[Math.floor(k * 4) % 4], k);
}

/** The stone-lined tube between the portals, with a rib every few metres. */
function tube(field: TerrainField, soup: Soup, t: Tunnel, inside: (x: number) => boolean) {
  const lining = archProfile(TUBE_HALF_WIDTH);
  const rib = archProfile(TUBE_HALF_WIDTH - RIB_INSET);
  const start = t.x0 + FACADE_INSIDE;
  const end = t.x1 - FACADE_INSIDE;
  const xs = new Set<number>([end]);
  for (let x = start; x < end; x += TUBE_STEP) xs.add(x);
  const ribs: number[] = [];
  for (let r = Math.ceil((start + 1) / RIB_SPACING) * RIB_SPACING; r + RIB_LENGTH < end - 1;) {
    ribs.push(r);
    xs.add(r).add(r + RIB_LENGTH);
    r += RIB_SPACING;
  }
  const sorted = [...xs].sort((a, b) => a - b);

  const world = (x: number, ring: Ring) => {
    const { side, origin } = frameAt(field, x);
    return ring.map(([a, y]) =>
      origin
        .clone()
        .addScaledVector(side, a)
        .setY(origin.y + y)
        .toArray(),
    );
  };
  // Faces wound to point into the tube; same-x pairs make the rib's stepped faces.
  const band = (xA: number, ringA: Ring, xB: number, ringB: Ring, base: Color, salt: number) => {
    if (!inside((xA + xB) / 2)) return;
    const a = world(xA, ringA);
    const b = world(xB, ringB);
    for (let i = 0; i < a.length - 1; i++) {
      const k = hash3f(Math.floor(xA * 2), i, salt, field.seed);
      const c = tint.copy(base).multiplyScalar(0.78 + k * 0.32);
      soup.tri(a[i], b[i], a[i + 1], c);
      soup.tri(b[i], b[i + 1], a[i + 1], c);
    }
  };
  for (let i = 0; i < sorted.length - 1; i++) {
    const [xA, xB] = [sorted[i], sorted[i + 1]];
    const onRib = ribs.some((r) => xA >= r - 1e-6 && xB <= r + RIB_LENGTH + 1e-6);
    if (onRib) band(xA, rib, xB, rib, PALETTE.portalFrame, 4);
    else band(xA, lining, xB, lining, PALETTE.tunnelLining, 3);
  }
  for (const r of ribs) {
    band(r, lining, r, rib, PALETTE.portalFrame, 5);
    band(r + RIB_LENGTH, rib, r + RIB_LENGTH, lining, PALETTE.portalFrame, 5);
  }
}

function arch(halfWidth: number, into = new Shape()): Shape {
  const pts = archProfile(halfWidth);
  into.moveTo(pts[0][0], pts[0][1]);
  for (const [a, y] of pts.slice(1)) into.lineTo(a, y);
  return into;
}

function portal(field: TerrainField, soup: Soup, x: number, outward: 1 | -1) {
  const { fwd, origin } = frameAt(field, x);
  const zAxis = fwd.clone().multiplyScalar(outward);
  const xAxis = new Vector3().crossVectors(UP, zAxis);
  const basis = new Matrix4().makeBasis(xAxis, UP, zAxis).setPosition(origin);

  // The hill cover is capped to meet this top (see `portalCap`).
  const top = PORTAL_TOP + 0.1;

  // Battered facade wall with the tube's arch cut through it.
  const facade = new Shape();
  facade.moveTo(-FACADE_HALF_WIDTH, -1.5);
  facade.lineTo(FACADE_HALF_WIDTH, -1.5);
  facade.lineTo(FACADE_HALF_WIDTH - 0.7, top);
  facade.lineTo(-FACADE_HALF_WIDTH + 0.7, top);
  facade.holes.push(arch(TUBE_HALF_WIDTH));
  const facadeGeo = new ExtrudeGeometry(facade, { depth: FACADE_DEPTH, bevelEnabled: false });
  facadeGeo.translate(0, 0, -FACADE_INSIDE);
  stone(soup, field, facadeGeo, basis, PALETTE.portalWall, 1);
  facadeGeo.dispose();

  // Voussoir ring standing proud of the facade: outer arch, then back along the opening.
  const front = FACADE_DEPTH - FACADE_INSIDE;
  const ring = arch(TUBE_HALF_WIDTH + RING_WIDTH);
  for (const [a, y] of archProfile(TUBE_HALF_WIDTH).reverse()) ring.lineTo(a, y);
  const ringGeo = new ExtrudeGeometry(ring, { depth: 0.35, bevelEnabled: false });
  ringGeo.translate(0, 0, front);
  stone(soup, field, ringGeo, basis, PALETTE.portalFrame, 2);
  ringGeo.dispose();

  const box = new BoxGeometry(1, 1, 1);
  const m = new Matrix4();
  const block = (cx: number, cy: number, cz: number, w: number, h: number, d: number) =>
    m.makeScale(w, h, d).setPosition(cx, cy, cz).premultiply(basis);
  const crown = TUBE_WALL + TUBE_HALF_WIDTH + RING_WIDTH;
  stone(soup, field, box, block(0, crown - 0.3, front + 0.3, 1, 1.2, 0.6), PALETTE.portalFrame, 3);
  // Pilasters at the ends, a cornice along the top, and the season's ground lying on it.
  for (const sgn of [-1, 1]) {
    const px = sgn * (FACADE_HALF_WIDTH - 1.2);
    const pilaster = block(px, (top - 1.5) / 2, front + 0.15, 1.1, top + 1.5, 0.3);
    stone(soup, field, box, pilaster, PALETTE.portalFrame, 4);
  }
  const corniceW = FACADE_HALF_WIDTH * 2 - 0.8;
  const cornice = block(
    0,
    top + 0.2,
    front - FACADE_DEPTH / 2 + 0.2,
    corniceW,
    0.4,
    FACADE_DEPTH + 0.4,
  );
  stone(soup, field, box, cornice, PALETTE.portalFrame, 5);
  const lip = groundColor(field, x, origin.z);
  stone(
    soup,
    field,
    box,
    block(0, top + 0.5, front - FACADE_DEPTH / 2, corniceW - 0.3, 0.2, FACADE_DEPTH),
    lip,
    6,
  );
  box.dispose();
}

/** Append the tube pieces and portals whose anchor point lies inside this chunk's bounds. */
export function buildTunnels(
  field: TerrainField,
  soup: Soup,
  xa: number,
  xb: number,
  za: number,
  zb: number,
) {
  const inside = (x: number) => {
    const z = field.route.z(x);
    return x >= xa && x < xb && z >= za && z < zb;
  };
  for (const t of field.tunnels.between(xa, xb)) {
    tube(field, soup, t, inside);
    if (inside(t.x0)) portal(field, soup, t.x0, -1);
    if (inside(t.x1)) portal(field, soup, t.x1, 1);
  }
}
