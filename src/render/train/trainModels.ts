/**
 * Low-poly train models built from three.js primitives (flat shaded). Local +x is forward, y up,
 * origin at the vehicle's centre at rail height. Returned groups expose their wheels for animation.
 */
import {
  BackSide,
  BoxGeometry,
  BufferAttribute,
  Color,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  PlaneGeometry,
  Shape,
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
    const animated = new Set<Mesh>(this.wheels.map((w) => w.mesh));
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

export function buildLocomotive(): VehicleModel {
  const b = new Builder();
  // Running gear and footplate.
  b.box(LOCO_LENGTH - 0.2, 0.3, 1.75, COLORS.locoBlack, 0, 1.2, 0, {
    roughness: 0.6,
    metalness: 0.3,
  });
  b.box(0.25, 0.5, 1.9, COLORS.wheelRed, LOCO_LENGTH / 2 - 0.15, 1.05, 0); // buffer beam
  b.box(0.25, 0.5, 1.9, COLORS.wheelRed, -LOCO_LENGTH / 2 + 0.15, 1.05, 0);
  b.wheelPair(0.5, 0.9, COLORS.wheelRed);
  b.wheelPair(0.5, -0.3, COLORS.wheelRed);
  b.wheelPair(0.32, 1.95, COLORS.wheelRed);
  b.wheelPair(0.32, -1.85, COLORS.wheelRed);
  // Boiler, smokebox, chimney, dome.
  b.barrel(0.7, 2.6, COLORS.locoGreen, 0.65, 2.05, 0, 8, { roughness: 0.45, metalness: 0.15 });
  b.barrel(0.74, 0.12, COLORS.brass, 0.0, 2.05, 0, 8, { roughness: 0.3, metalness: 1 });
  b.barrel(0.74, 0.12, COLORS.brass, 1.2, 2.05, 0, 8, { roughness: 0.3, metalness: 1 });
  b.barrel(0.74, 0.7, COLORS.locoBlack, 2.2, 2.05, 0, 8, { roughness: 0.5, metalness: 0.3 });
  b.add(
    new CylinderGeometry(0.32, 0.22, 0.9, 7),
    b.mat(COLORS.locoBlack, { roughness: 0.5 }),
    2.2,
    3.05,
    0,
  );
  b.add(
    new CylinderGeometry(0.22, 0.3, 0.45, 7),
    b.mat(COLORS.brass, { roughness: 0.3, metalness: 1 }),
    0.8,
    2.85,
    0,
  );
  // Cab.
  b.box(1.7, 1.9, 1.85, COLORS.locoGreen, -1.55, 2.3, 0, { roughness: 0.45, metalness: 0.15 });
  b.box(2.0, 0.16, 2.05, COLORS.locoBlack, -1.6, 3.3, 0);
  // Tinted glass (see-through, so the cab view can look out of it).
  const glass = b.glass();
  b.add(new BoxGeometry(0.04, 0.54, 0.54), glass, -0.68, 2.7, 0.48).castShadow = false;
  b.add(new BoxGeometry(0.04, 0.54, 0.54), glass, -0.68, 2.7, -0.48).castShadow = false;
  b.add(new BoxGeometry(0.9, 0.5, 0.04), glass, -1.55, 2.72, 0.93).castShadow = false;
  b.add(new BoxGeometry(0.9, 0.5, 0.04), glass, -1.55, 2.72, -0.93).castShadow = false;
  // Cowcatcher + headlamp.
  b.add(new ConeGeometry(0.85, 0.7, 4), b.mat(COLORS.locoBlack), 2.75, 0.75, 0, [
    0,
    Math.PI / 4,
    -Math.PI / 2,
  ]);
  b.box(0.2, 0.3, 0.35, COLORS.lamp, 2.62, 2.75, 0, {
    emissive: COLORS.lamp,
    emissiveIntensity: 4,
  });
  return b.build({ chimney: [2.2, 3.55, 0], exhaust: "steam" });
}

export function buildCarriage(variant = 0): VehicleModel {
  const b = new Builder();
  const lower = variant % 2 === 0 ? COLORS.maroon : COLORS.locoGreen;
  b.box(CARRIAGE_LENGTH - 0.2, 0.25, 1.6, COLORS.locoBlack, 0, 1.15, 0);
  b.box(CARRIAGE_LENGTH, 0.8, 1.8, lower, 0, 1.7, 0, { roughness: 0.5, metalness: 0.1 });
  b.box(CARRIAGE_LENGTH, 0.8, 1.8, COLORS.cream, 0, 2.5, 0, { roughness: 0.6 });
  for (let i = 0; i < 4; i++) {
    const x = -1.65 + i * 1.1;
    for (const z of [0.91, -0.91])
      b.box(0.7, 0.45, 0.04, COLORS.windowLit, x, 2.55, z, {
        roughness: 0.2,
        emissive: COLORS.windowLit,
        emissiveIntensity: 0.35,
      });
  }
  // Curved-ish roof: a half hexagonal prism along x, flattened (local x becomes world up).
  b.add(
    new CylinderGeometry(1, 1, CARRIAGE_LENGTH + 0.1, 6, 1, false, 0, Math.PI),
    b.mat(COLORS.locoBlack, { roughness: 0.7 }),
    0,
    2.9,
    0,
    [0, 0, Math.PI / 2],
  ).scale.set(0.3, 1, 1);
  b.box(0.2, 0.35, 1.9, COLORS.locoBlack, CARRIAGE_LENGTH / 2, 1.1, 0);
  b.box(0.2, 0.35, 1.9, COLORS.locoBlack, -CARRIAGE_LENGTH / 2, 1.1, 0);
  for (const x of [-1.6, -0.9, 0.9, 1.6]) b.wheelPair(0.3, x, COLORS.locoBlack);
  return b.build();
}
