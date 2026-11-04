/**
 * Low-poly train models built from three.js primitives (flat shaded). Local +x is forward, y up,
 * origin at the vehicle's centre at rail height. Returned groups expose their wheels for animation.
 */
import {
  BackSide,
  BoxGeometry,
  BufferAttribute,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  PlaneGeometry,
  Shape,
  SphereGeometry,
  type BufferGeometry,
  type Material,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { COLORS, flatMaterial } from "@/render/lowpoly";

export const LOCO_LENGTH = 5.2;
export const CARRIAGE_LENGTH = 4.6;
export const COUPLING_GAP = 0.35;
/** Height where the wheels meet the rails. */
const RAIL_Y = 0.45;

export interface VehicleModel {
  group: Group;
  wheels: { mesh: Mesh; radius: number }[];
  /** Chimney / exhaust outlet in local space (locomotive only). */
  chimney?: [number, number, number];
  /** What comes out of `chimney`; electrics have none. */
  exhaust?: "steam" | "diesel";
  /** Driver's eye in local space for the cab camera; defaults to the steam cab. */
  cabEye?: [number, number, number];
  /** Modelled driving cab (child of `group`), shown only in the cab view. */
  cab?: { group: Group; update(speedFrac: number, t: number): void };
  /** Moves running gear (rods, crossheads) for the distance travelled, alongside the wheels. */
  animate?(distance: number): void;
  /** Overall length and bogie-centre half spacing; default to the heritage sizes. */
  length?: number;
  halfBase?: number;
  dispose(): void;
}

type MatOpts = Parameters<typeof flatMaterial>[1];

export class Builder {
  readonly group = new Group();
  readonly wheels: { mesh: Mesh; radius: number }[] = [];
  private owned: (BufferGeometry | Material)[] = [];
  private moving = new Set<Mesh>();

  /** Keep a mesh separate (not merged) because it is animated. */
  movable(mesh: Mesh): Mesh {
    this.moving.add(mesh);
    return mesh;
  }

  /** Hand over geometry/materials created outside `add()` so they're disposed with the model. */
  track(...items: (BufferGeometry | Material)[]) {
    this.owned.push(...items);
  }
  private mats = new Map<string, Material>();

  mat(color: number, opts?: MatOpts): Material {
    const key = `${color}:${JSON.stringify(opts ?? {})}`;
    let m = this.mats.get(key);
    if (!m) {
      m = flatMaterial(color, opts);
      this.mats.set(key, m);
      this.owned.push(m);
    }
    return m;
  }

  add(
    geo: BufferGeometry,
    material: Material,
    x: number,
    y: number,
    z: number,
    rot?: [number, number, number],
  ): Mesh {
    this.owned.push(geo);
    const mesh = new Mesh(geo, material);
    mesh.position.set(x, y, z);
    if (rot) mesh.rotation.set(...rot);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);
    return mesh;
  }

  box(
    w: number,
    h: number,
    d: number,
    color: number,
    x: number,
    y: number,
    z: number,
    opts?: MatOpts,
  ) {
    return this.add(new BoxGeometry(w, h, d), this.mat(color, opts), x, y, z);
  }

  glass(): Material {
    const m = flatMaterial(0x9fc3d6, { roughness: 0.05, metalness: 0.3 });
    m.transparent = true;
    m.opacity = 0.22;
    m.depthWrite = false;
    this.owned.push(m);
    return m;
  }

  /** White material that takes its colours from the geometry (painted lofts, wheels). */
  paintMat(opts?: MatOpts, look: { backSide?: boolean } = {}): Material {
    const key = `paint:${JSON.stringify(opts ?? {})}:${JSON.stringify(look)}`;
    let m = this.mats.get(key);
    if (!m) {
      const std = flatMaterial(0xffffff, opts);
      std.vertexColors = true;
      if (look.backSide) std.side = BackSide;
      m = std;
      this.mats.set(key, m);
      this.owned.push(m);
    }
    return m;
  }

  /** Cylinder lying along x. */
  barrel(
    r: number,
    len: number,
    color: number,
    x: number,
    y: number,
    z: number,
    sides = 8,
    opts?: MatOpts,
  ) {
    return this.add(new CylinderGeometry(r, r, len, sides), this.mat(color, opts), x, y, z, [
      0,
      0,
      Math.PI / 2,
    ]);
  }

  /**
   * One-sided panel facing +x (dir 1) or -x (dir -1), optionally tilted back by `tilt` radians.
   * Used for windscreens: opaque from outside, invisible from a cab camera behind it.
   */
  pane(w: number, h: number, color: number, x: number, y: number, z: number, dir = 1, tilt = 0) {
    const m = this.add(new PlaneGeometry(w, h), this.mat(color, { roughness: 0.15 }), x, y, z);
    m.rotation.set(0, (dir * Math.PI) / 2, dir * tilt, "ZYX");
    m.castShadow = false;
    return m;
  }

  private extrude(points: [number, number][], depth: number) {
    const shape = new Shape();
    shape.moveTo(...points[0]);
    for (const p of points.slice(1)) shape.lineTo(...p);
    shape.closePath();
    return new ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  }

  /** Side profile (x, y points) extruded across the full width, centred on z = 0. */
  prism(points: [number, number][], width: number, color: number, opts?: MatOpts) {
    const geo = this.extrude(points, width);
    geo.translate(0, 0, -width / 2);
    return this.add(geo, this.mat(color, opts), 0, 0, 0);
  }

  /** Cross-section (z, y points, symmetric about z = 0) extruded along x from x0 to x1. */
  section(points: [number, number][], x0: number, x1: number, color: number, opts?: MatOpts) {
    const geo = this.extrude(points, x1 - x0);
    geo.rotateY(Math.PI / 2).translate(x0, 0, 0);
    return this.add(geo, this.mat(color, opts), 0, 0, 0);
  }

  /** Plan outline (x, z points, symmetric about z = 0) extruded upwards from y0 to y1. */
  plan(points: [number, number][], y0: number, y1: number, color: number, opts?: MatOpts) {
    const geo = this.extrude(points, y1 - y0);
    geo.rotateX(-Math.PI / 2).translate(0, y0, 0);
    return this.add(geo, this.mat(color, opts), 0, 0, 0);
  }

  private wheelGeos = new Map<string, BufferGeometry>();

  /** One wheel as a single painted mesh: tyre, inner flange, disc face and a hub bar. */
  private wheelGeometry(r: number, face: number, tyre: number, inner: 1 | -1) {
    const key = `${r}:${face}:${tyre}:${inner}`;
    let geo = this.wheelGeos.get(key);
    if (geo) return geo;
    const tint = new Color();
    const part = (g: BufferGeometry, color: number, dy = 0) => {
      const p = (g.index ? g.toNonIndexed() : g).translate(0, dy, 0);
      g.dispose();
      tint.setHex(color);
      const n = p.attributes.position.count;
      p.setAttribute(
        "color",
        new BufferAttribute(
          new Float32Array(n * 3).map((_, i) => [tint.r, tint.g, tint.b][i % 3]),
          3,
        ),
      );
      p.deleteAttribute("uv");
      return p;
    };
    const parts = [
      part(new CylinderGeometry(r, r, 0.12, 14), tyre),
      part(new CylinderGeometry(r * 1.1, r * 1.1, 0.03, 14), 0x2a2c30, inner * 0.06),
      part(new CylinderGeometry(r * 0.8, r * 0.8, 0.14, 14), face),
      part(new CylinderGeometry(r * 0.24, r * 0.24, 0.18, 8), 0x1d1f22),
      part(new BoxGeometry(r * 1.35, 0.16, 0.07), 0x1d1f22),
    ];
    geo = mergeGeometries(parts, false)!;
    parts.forEach((p) => p.dispose());
    this.wheelGeos.set(key, geo);
    this.owned.push(geo);
    return geo;
  }

  /** Wheelset (both wheels plus a static axle), axis along z. `color` is the wheel centre. */
  wheelPair(r: number, x: number, color: number, tyre = 0x5d6168) {
    const mat = this.paintMat({ roughness: 0.5, metalness: 0.4 });
    for (const z of [-0.72, 0.72]) {
      const geo = this.wheelGeometry(r, color, tyre, z > 0 ? -1 : 1);
      const w = new Mesh(geo, mat);
      w.position.set(x, r + RAIL_Y, z);
      w.rotation.set(Math.PI / 2, 0, 0);
      w.castShadow = true;
      this.group.add(w);
      this.wheels.push({ mesh: w, radius: r });
    }
    this.add(new CylinderGeometry(0.05, 0.05, 1.3, 6), this.mat(0x2a2c30), x, r + RAIL_Y, 0, [
      Math.PI / 2,
      0,
      0,
    ]);
  }

  build(extra?: Partial<VehicleModel>): VehicleModel {
    this.mergeStatic();
    const owned = this.owned;
    return {
      group: this.group,
      wheels: this.wheels,
      ...extra,
      dispose: () => owned.forEach((o) => o.dispose()),
    };
  }

  /** Merge every non-animated mesh into one draw call per material (detail stays cheap). */
  private mergeStatic() {
    const animated = new Set<Mesh>([...this.wheels.map((w) => w.mesh), ...this.moving]);
    const buckets = new Map<string, { mat: Material; cast: boolean; geos: BufferGeometry[] }>();
    for (const child of [...this.group.children]) {
      if (!(child instanceof Mesh) || animated.has(child)) continue;
      child.updateMatrix();
      const src = child.geometry as BufferGeometry;
      const g = (src.index ? src.toNonIndexed() : src.clone()).applyMatrix4(child.matrix);
      const keep = new Set(["position", "normal", "uv", "color"]);
      for (const name of Object.keys(g.attributes)) if (!keep.has(name)) g.deleteAttribute(name);
      g.clearGroups();
      const mat = child.material as Material;
      const key = `${mat.uuid}:${child.castShadow}`;
      let bucket = buckets.get(key);
      if (!bucket) buckets.set(key, (bucket = { mat, cast: child.castShadow, geos: [] }));
      bucket.geos.push(g);
      this.group.remove(child);
    }
    for (const { mat, cast, geos } of buckets.values()) {
      const merged = mergeGeometries(geos, false);
      geos.forEach((g) => g.dispose());
      if (!merged) continue;
      this.owned.push(merged);
      const mesh = new Mesh(merged, mat);
      mesh.castShadow = cast;
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }
  }
}

/**
 * Uniformly scales a built vehicle about the railhead so it stays on the rails; the wheels keep
 * the track gauge and roll at the right rate for their new size.
 */
export function scaleVehicle(model: VehicleModel, s: number): VehicleModel {
  const inner = new Group();
  inner.add(...model.group.children);
  inner.scale.setScalar(s);
  inner.position.y = RAIL_Y * (1 - s);
  model.group.add(inner);
  for (const w of model.wheels) {
    w.mesh.position.z /= s;
    w.radius *= s;
  }
  const point = ([x, y, z]: [number, number, number]): [number, number, number] => [
    x * s,
    RAIL_Y + (y - RAIL_Y) * s,
    z * s,
  ];
  return {
    ...model,
    chimney: model.chimney && point(model.chimney),
    cabEye: model.cabEye && point(model.cabEye),
    length: model.length && model.length * s,
    halfBase: model.halfBase && model.halfBase * s,
  };
}

/**
 * Heritage side-tank engine (0-4-2T style with a leading pony truck): outside cylinders with
 * animated coupling and connecting rods, side tanks, a banded boiler, smokebox door, brass dome and
 * safety valves, buffers and lamp irons. The cab envelope (x -2.4..-0.7) matches `cabInterior`.
 */
export function buildLocomotive(): VehicleModel {
  const b = new Builder();
  const green = COLORS.locoGreen;
  const black = COLORS.locoBlack;
  const paint = { roughness: 0.4, metalness: 0.15 };
  const iron = { roughness: 0.55, metalness: 0.4 };
  const brass = { roughness: 0.3, metalness: 1 };
  const steel = { roughness: 0.35, metalness: 0.8 };
  const lineGold = 0xd9a441;
  const half = LOCO_LENGTH / 2;

  // --- Frames, running plate, buffer beams, buffers -------------------------------------------
  b.box(LOCO_LENGTH - 0.3, 0.55, 1.2, black, 0, 1.15, 0, iron); // main frames between the wheels
  b.box(LOCO_LENGTH - 0.2, 0.1, 1.95, black, 0, 1.45, 0, iron); // running plate
  for (const z of [-0.95, 0.95]) b.box(LOCO_LENGTH - 0.3, 0.16, 0.05, COLORS.wheelRed, 0, 1.33, z); // valance
  for (const [x, dir] of [
    [half - 0.12, 1],
    [-half + 0.12, -1],
  ] as const) {
    b.box(0.22, 0.45, 1.95, COLORS.wheelRed, x, 1.2, 0, paint);
    for (const z of [-0.62, 0.62]) {
      b.barrel(0.09, 0.22, black, x + dir * 0.17, 1.15, z, 8, iron); // buffer stock
      b.barrel(0.17, 0.05, 0x9a9da3, x + dir * 0.28, 1.15, z, 12, steel); // buffer head
    }
    b.box(0.18, 0.08, 0.12, black, x + dir * 0.18, 1.1, 0, iron); // coupling hook
    b.box(0.04, 0.22, 0.04, black, x + dir * 0.12, 1.55, 0.45, iron); // lamp iron
  }
  // Sand boxes and steps.
  for (const z of [-0.9, 0.9]) {
    b.box(0.25, 0.25, 0.16, green, 1.75, 1.62, z, paint);
    b.box(0.3, 0.04, 0.22, black, -1.0, 0.95, z * 1.08, iron);
    b.box(0.3, 0.04, 0.22, black, -1.0, 0.65, z * 1.08, iron);
    b.box(0.04, 0.5, 0.22, black, -1.15, 0.8, z * 1.08, iron);
  }

  // --- Wheels -----------------------------------------------------------------------------------
  const DRIVER_R = 0.5;
  const AXLE_Y = DRIVER_R + RAIL_Y;
  const DRIVERS = [0.9, -0.35];
  for (const x of DRIVERS) b.wheelPair(DRIVER_R, x, COLORS.wheelRed);
  b.wheelPair(0.32, 1.95, COLORS.wheelRed);
  b.wheelPair(0.32, -1.85, COLORS.wheelRed);

  // --- Outside cylinders, slide bars, valve chests ----------------------------------------------
  const CYL_X = 2.22;
  const CYL_Z = 1.02;
  for (const z of [-CYL_Z, CYL_Z]) {
    b.barrel(0.24, 0.55, black, CYL_X, AXLE_Y + 0.05, z, 12, iron);
    for (const x of [CYL_X - 0.29, CYL_X + 0.29])
      b.barrel(0.26, 0.04, 0x9a9da3, x, AXLE_Y + 0.05, z, 12, steel); // covers
    b.box(0.45, 0.22, 0.2, black, CYL_X, AXLE_Y + 0.36, z * 0.97, iron); // valve chest
    b.box(0.55, 0.03, 0.04, 0x9a9da3, 1.72, AXLE_Y + 0.13, z * 0.95, steel); // slide bars
    b.box(0.55, 0.03, 0.04, 0x9a9da3, 1.72, AXLE_Y - 0.03, z * 0.95, steel);
  }

  // --- Side tanks with gold lining and brass number plates ---------------------------------------
  const TANK = { x0: -0.6, x1: 1.6, zIn: 0.5, zOut: 0.98, y0: 1.5, y1: 2.5 };
  for (const s of [-1, 1]) {
    // `section` maps the profile's first coordinate to world -z, hence the -s.
    b.section(
      [
        [-s * TANK.zIn, TANK.y0],
        [-s * TANK.zOut, TANK.y0],
        [-s * TANK.zOut, TANK.y1 - 0.12],
        [-s * (TANK.zOut - 0.12), TANK.y1],
        [-s * TANK.zIn, TANK.y1],
      ],
      TANK.x0,
      TANK.x1,
      green,
      paint,
    );
    const zf = s * (TANK.zOut + 0.006);
    b.box(TANK.x1 - TANK.x0 - 0.2, 0.03, 0.01, lineGold, (TANK.x0 + TANK.x1) / 2, 1.62, zf);
    b.box(TANK.x1 - TANK.x0 - 0.2, 0.03, 0.01, lineGold, (TANK.x0 + TANK.x1) / 2, 2.28, zf);
    for (const x of [TANK.x0 + 0.1, TANK.x1 - 0.1]) b.box(0.03, 0.69, 0.01, lineGold, x, 1.95, zf);
    b.box(0.5, 0.2, 0.02, COLORS.brass, 0.5, 1.95, s * (TANK.zOut + 0.01), brass); // number plate
    b.barrel(0.1, 0.06, black, 1.35, TANK.y1 + 0.03, s * 0.74, 8, iron); // filler cap
  }

  // --- Boiler, smokebox, chimney, dome, safety valves, whistle -----------------------------------
  const BOILER_Y = 2.15;
  b.barrel(0.66, 2.6, green, 0.6, BOILER_Y, 0, 16, paint);
  for (const x of [-0.6, 0.2, 1.0, 1.75])
    b.barrel(0.675, 0.07, COLORS.brass, x, BOILER_Y, 0, 16, brass);
  b.barrel(0.7, 0.75, black, 2.2, BOILER_Y, 0, 16, iron); // smokebox
  b.box(0.7, 0.55, 1.05, black, 2.2, 1.6, 0, iron); // saddle
  b.barrel(0.6, 0.05, black, 2.6, BOILER_Y, 0, 16, iron); // smokebox door
  b.barrel(0.12, 0.08, 0x9a9da3, 2.64, BOILER_Y, 0, 8, steel); // door centre
  b.box(0.04, 0.05, 0.3, 0x9a9da3, 2.67, BOILER_Y, 0, steel); // dart handle
  for (const y of [BOILER_Y + 0.28, BOILER_Y - 0.28])
    b.box(0.03, 0.05, 0.75, black, 2.64, y, 0, iron);
  b.box(0.25, 0.12, 0.02, COLORS.brass, 2.66, BOILER_Y + 0.45, 0, brass); // smokebox number plate
  // Chimney: base flare, tapered stack, copper cap.
  b.add(new CylinderGeometry(0.26, 0.34, 0.25, 12), b.mat(black, iron), 2.2, 2.92, 0);
  b.add(new CylinderGeometry(0.21, 0.24, 0.55, 12), b.mat(black, iron), 2.2, 3.2, 0);
  b.add(new CylinderGeometry(0.29, 0.24, 0.16, 12), b.mat(0xb8643a, brass), 2.2, 3.5, 0);
  // Dome and safety valves (polished brass), whistle in front of the cab.
  b.add(new CylinderGeometry(0.3, 0.36, 0.2, 12), b.mat(COLORS.brass, brass), 0.85, 2.84, 0);
  b.add(new CylinderGeometry(0.22, 0.3, 0.28, 12), b.mat(COLORS.brass, brass), 0.85, 3.08, 0);
  b.add(
    new SphereGeometry(0.22, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    b.mat(COLORS.brass, brass),
    0.85,
    3.22,
    0,
  );
  b.add(new CylinderGeometry(0.17, 0.2, 0.18, 10), b.mat(COLORS.brass, brass), -0.35, 2.85, 0);
  for (const z of [-0.07, 0.07])
    b.add(new CylinderGeometry(0.045, 0.05, 0.22, 8), b.mat(COLORS.brass, brass), -0.35, 3.04, z);
  b.add(new CylinderGeometry(0.05, 0.035, 0.28, 8), b.mat(COLORS.brass, brass), -0.6, 2.95, 0);
  // Handrails along the boiler on short stanchions.
  for (const z of [-0.6, 0.6]) {
    b.barrel(0.02, 2.5, 0x9a9da3, 0.85, BOILER_Y + 0.42, z, 6, steel);
    for (const x of [-0.25, 0.85, 1.95])
      b.box(0.03, 0.08, 0.06, 0x9a9da3, x, BOILER_Y + 0.38, z * 0.96, steel);
  }

  // --- Cab: body, curved roof, window frames, rear coal rails, lamps ----------------------------
  b.box(1.7, 1.9, 1.85, green, -1.55, 2.3, 0, paint);
  b.section(
    [
      [-1.06, 3.2],
      [1.06, 3.2],
      [1.06, 3.27],
      [0.6, 3.4],
      [0, 3.45],
      [-0.6, 3.4],
      [-1.06, 3.27],
    ],
    -2.5,
    -0.6,
    black,
    iron,
  );
  for (const z of [-0.94, 0.94]) {
    b.box(1.5, 0.03, 0.01, lineGold, -1.55, 1.5, z); // cab lining
    b.box(1.5, 0.03, 0.01, lineGold, -1.55, 3.08, z);
    b.box(0.04, 0.9, 0.04, 0x9a9da3, -0.78, 2.05, z * 1.01, steel); // grab handle
  }
  // Brass rims round the round-cornered front spectacle glasses.
  for (const z of [-0.48, 0.48]) {
    for (const y of [2.42, 2.98]) b.box(0.03, 0.04, 0.6, COLORS.brass, -0.68, y, z, brass);
    for (const dz of [-0.29, 0.29]) b.box(0.03, 0.6, 0.04, COLORS.brass, -0.68, 2.7, z + dz, brass);
  }
  const glass = b.glass();
  b.add(new BoxGeometry(0.04, 0.54, 0.54), glass, -0.68, 2.7, 0.48).castShadow = false;
  b.add(new BoxGeometry(0.04, 0.54, 0.54), glass, -0.68, 2.7, -0.48).castShadow = false;
  b.add(new BoxGeometry(0.9, 0.5, 0.04), glass, -1.55, 2.72, 0.93).castShadow = false;
  b.add(new BoxGeometry(0.9, 0.5, 0.04), glass, -1.55, 2.72, -0.93).castShadow = false;
  // Head lamp on the smokebox top, and two lamps on the front buffer beam.
  b.box(0.2, 0.28, 0.3, COLORS.lamp, 2.5, 2.98, 0, { emissive: COLORS.lamp, emissiveIntensity: 4 });
  b.box(0.16, 0.2, 0.2, COLORS.lamp, half - 0.02, 1.6, 0.45, {
    emissive: COLORS.lamp,
    emissiveIntensity: 3,
  });
  b.box(0.12, 0.18, 0.18, COLORS.wheelRed, -half + 0.02, 1.6, 0.45, {
    emissive: COLORS.wheelRed,
    emissiveIntensity: 1.5,
  });

  // --- Animated motion: coupling rods, connecting rods, crossheads -------------------------------
  const CRANK = 0.2;
  const CONROD = 0.85;
  /** Crosshead / piston line, level with the cylinder centres. */
  const SLIDE_Y = AXLE_Y + 0.05;
  const rodMat = b.mat(0xa9adb3, steel);
  const sides = [
    { z: 0.86, phase: 0 },
    { z: -0.86, phase: Math.PI / 2 },
  ].map(({ z, phase }) => ({
    phase,
    coupling: b.movable(
      b.add(new BoxGeometry(DRIVERS[0] - DRIVERS[1], 0.09, 0.05), rodMat, 0, 0, z),
    ),
    conrod: b.movable(b.add(new BoxGeometry(CONROD, 0.08, 0.05), rodMat, 0, 0, z * 1.08)),
    crosshead: b.movable(b.add(new BoxGeometry(0.18, 0.14, 0.08), rodMat, 0, 0, z * 1.1)),
    piston: b.movable(
      b.add(new CylinderGeometry(0.03, 0.03, 0.3, 6), rodMat, 0, 0, z * 1.1, [0, 0, Math.PI / 2]),
    ),
  }));
  const animate = (distance: number) => {
    for (const s of sides) {
      // Same sense as the wheels: rolling forward turns the crank clockwise seen from +z.
      const a = s.phase - distance / DRIVER_R;
      const px = Math.cos(a) * CRANK;
      const py = Math.sin(a) * CRANK;
      s.coupling.position.set(
        (DRIVERS[0] + DRIVERS[1]) / 2 + px,
        AXLE_Y + py,
        s.coupling.position.z,
      );
      const pinX = DRIVERS[0] + px;
      const pinY = AXLE_Y + py;
      const crossX = pinX + Math.sqrt(CONROD * CONROD - (SLIDE_Y - pinY) ** 2);
      s.conrod.position.set((pinX + crossX) / 2, (pinY + SLIDE_Y) / 2, s.conrod.position.z);
      s.conrod.rotation.z = Math.atan2(SLIDE_Y - pinY, crossX - pinX);
      s.crosshead.position.set(crossX, SLIDE_Y, s.crosshead.position.z);
      s.piston.position.set(crossX + 0.15, SLIDE_Y, s.piston.position.z);
    }
  };
  animate(0);

  return b.build({ chimney: [2.2, 3.6, 0], exhaust: "steam", animate });
}

/**
 * Heritage compartment coach to match the tank engine: two-tone panelled body with gold lining,
 * four compartments (door with droplight and brass handle, quarter-lights either side), an
 * elliptical roof with lamp tops, footboards, bogies with axleboxes and springs, a trussed
 * underframe with gas and vacuum cylinders, and buffers that meet their neighbours'.
 */
export function buildCarriage(variant = 0): VehicleModel {
  const b = new Builder();
  const lower = variant % 2 === 0 ? COLORS.maroon : COLORS.locoGreen;
  const black = COLORS.locoBlack;
  const paint = { roughness: 0.45, metalness: 0.1 };
  const iron = { roughness: 0.55, metalness: 0.4 };
  const brass = { roughness: 0.3, metalness: 1 };
  const steel = { roughness: 0.35, metalness: 0.8 };
  const lineGold = 0xd9a441;
  const lit = { roughness: 0.2, emissive: COLORS.windowLit, emissiveIntensity: 0.35 };
  const half = CARRIAGE_LENGTH / 2;
  const SIDE = 0.9;
  /** Face of the bodyside, where panes, lining and fittings sit. */
  const FACE = SIDE + 0.01;
  const COMPARTMENTS = [-1.65, -0.55, 0.55, 1.65];

  // --- Body: lower and upper panels, waist band, lining ------------------------------------------
  b.box(CARRIAGE_LENGTH, 0.8, SIDE * 2, lower, 0, 1.7, 0, paint);
  b.box(CARRIAGE_LENGTH, 0.8, SIDE * 2, COLORS.cream, 0, 2.5, 0, { roughness: 0.6 });
  for (const s of [-1, 1]) {
    b.box(CARRIAGE_LENGTH, 0.08, 0.02, black, 0, 2.1, s * FACE); // waist band
    b.box(CARRIAGE_LENGTH - 0.1, 0.025, 0.01, lineGold, 0, 2.16, s * (FACE + 0.01));
    b.box(CARRIAGE_LENGTH - 0.1, 0.025, 0.01, lineGold, 0, 1.38, s * (FACE + 0.005));
    b.box(CARRIAGE_LENGTH, 0.06, 0.02, black, 0, 2.88, s * FACE); // cantrail
    b.box(CARRIAGE_LENGTH - 0.3, 0.04, 0.12, black, 0, 1.2, s * (SIDE + 0.08)); // footboard
  }
  for (const s of [-1, 1])
    for (const xc of COMPARTMENTS) {
      const z = s * (FACE + 0.005);
      // Door: outline, droplight, brass handle; lower panel lined in gold either side.
      for (const dx of [-0.29, 0.29]) b.box(0.025, 1.5, 0.01, black, xc + dx, 2.1, z);
      b.box(0.58, 0.025, 0.01, black, xc, 2.85, z);
      b.box(0.36, 0.42, 0.02, COLORS.windowLit, xc, 2.52, s * FACE, lit);
      b.box(0.08, 0.04, 0.05, COLORS.brass, xc + 0.2, 2.02, s * (FACE + 0.02), brass);
      b.box(0.03, 0.35, 0.03, COLORS.brass, xc - 0.24, 2.25, s * (FACE + 0.02), brass);
      for (const dx of [-0.42, 0.42]) {
        b.box(0.15, 0.4, 0.02, COLORS.windowLit, xc + dx, 2.5, s * FACE, lit); // quarter-light
        b.box(0.15, 0.12, 0.02, COLORS.windowLit, xc + dx, 2.78, s * FACE, lit); // toplight
        b.box(0.12, 0.5, 0.01, lineGold, xc + dx, 1.72, z); // lower panel lining
        b.box(0.1, 0.46, 0.012, lower, xc + dx, 1.72, s * (FACE + 0.008));
      }
    }

  // --- Ends: panels, steps, buffers, couplings -----------------------------------------------------
  for (const dir of [-1, 1]) {
    const x = dir * half;
    b.box(0.2, 0.35, 1.9, black, x, 1.1, 0, iron); // headstock
    for (const z of [-0.62, 0.62]) {
      b.barrel(0.08, 0.08, black, x + dir * 0.11, 1.12, z, 8, iron);
      b.barrel(0.15, 0.04, 0x9a9da3, x + dir * 0.16, 1.12, z, 12, steel);
    }
    b.box(0.14, 0.07, 0.1, black, x + dir * 0.12, 1.05, 0, iron); // coupling hook
    b.box(0.05, 0.8, 0.05, 0x9a9da3, x + dir * 0.02, 2.3, 0.55, steel); // end handrail
    b.box(0.1, 0.03, 0.3, black, x + dir * 0.06, 1.6, -0.5, iron); // end step
  }

  // --- Roof: elliptical arch with overhang, rain strips, lamp tops --------------------------------
  const ROOF_BASE = 2.88;
  const arch: [number, number][] = [];
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * (i / 10);
    arch.push([Math.cos(a) * 0.97, ROOF_BASE + Math.sin(a) * 0.3]);
  }
  b.section(arch, -half - 0.08, half + 0.08, 0x3b3d40, { roughness: 0.8 });
  for (const z of [-0.78, 0.78])
    b.box(CARRIAGE_LENGTH, 0.025, 0.03, black, 0, ROOF_BASE + 0.13, z, iron); // rain strip
  for (const xc of COMPARTMENTS) {
    b.add(new CylinderGeometry(0.09, 0.11, 0.08, 10), b.mat(black, iron), xc, ROOF_BASE + 0.33, 0);
    b.add(new CylinderGeometry(0.05, 0.09, 0.08, 10), b.mat(black, iron), xc, ROOF_BASE + 0.41, 0);
  }

  // --- Underframe: solebars, truss rods, gas and vacuum cylinders -----------------------------------
  b.box(CARRIAGE_LENGTH - 0.2, 0.25, 1.6, black, 0, 1.15, 0, iron);
  for (const z of [-0.82, 0.82]) {
    b.box(CARRIAGE_LENGTH - 0.2, 0.2, 0.05, black, 0, 1.2, z, iron); // solebar
    for (const x of [-0.35, 0.35]) b.box(0.04, 0.2, 0.04, black, x, 0.95, z * 0.9, iron); // queen posts
    b.box(0.72, 0.03, 0.03, black, 0, 0.85, z * 0.9, iron); // truss rod
    for (const s of [-1, 1]) {
      const rod = b.box(0.3, 0.03, 0.03, black, s * 0.5, 0.95, z * 0.9, iron);
      rod.rotation.z = s * 0.7;
    }
  }
  b.barrel(0.13, 0.9, 0x6b6f75, 0, 0.98, 0.35, 10, iron); // gas cylinder
  b.add(new CylinderGeometry(0.15, 0.15, 0.32, 10), b.mat(black, iron), 0, 0.9, -0.38);

  // --- Bogies: frames, axleboxes, springs, bolster -------------------------------------------------
  const WHEEL_R = 0.3;
  const AXLE_Y = WHEEL_R + RAIL_Y;
  for (const [x0, x1] of [
    [-1.6, -0.9],
    [0.9, 1.6],
  ]) {
    b.wheelPair(WHEEL_R, x0, black);
    b.wheelPair(WHEEL_R, x1, black);
    const xc = (x0 + x1) / 2;
    for (const z of [-0.88, 0.88]) {
      b.box(1.15, 0.12, 0.05, black, xc, AXLE_Y + 0.08, z, iron); // side frame
      for (const x of [x0, x1]) {
        b.box(0.18, 0.2, 0.1, 0x3f4247, x, AXLE_Y, z, iron); // axlebox
        b.box(0.34, 0.06, 0.08, 0x9a9da3, x, AXLE_Y + 0.17, z, steel); // leaf spring
      }
    }
    b.box(0.15, 0.12, 1.75, black, xc, AXLE_Y + 0.2, 0, iron); // bolster
  }
  return b.build();
}
