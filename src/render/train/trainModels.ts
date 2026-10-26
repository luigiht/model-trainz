/**
 * Low-poly train models built from three.js primitives (flat shaded). Local +x is forward, y up,
 * origin at the vehicle's centre at rail height. Returned groups expose their wheels for animation.
 */
import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  type BufferGeometry,
  type Material,
} from "three";
import { COLORS, flatMaterial } from "@/render/lowpoly";

export const LOCO_LENGTH = 5.2;
export const CARRIAGE_LENGTH = 4.6;
export const COUPLING_GAP = 0.35;

export interface VehicleModel {
  group: Group;
  wheels: { mesh: Mesh; radius: number }[];
  /** Chimney position in local space (locomotive only). */
  chimney?: [number, number, number];
  dispose(): void;
}

class Builder {
  readonly group = new Group();
  readonly wheels: { mesh: Mesh; radius: number }[] = [];
  private owned: (BufferGeometry | Material)[] = [];
  private mats = new Map<string, Material>();

  mat(color: number, opts?: Parameters<typeof flatMaterial>[1]): Material {
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
    opts?: Parameters<typeof flatMaterial>[1],
  ) {
    return this.add(new BoxGeometry(w, h, d), this.mat(color, opts), x, y, z);
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
    opts?: Parameters<typeof flatMaterial>[1],
  ) {
    return this.add(new CylinderGeometry(r, r, len, sides), this.mat(color, opts), x, y, z, [
      0,
      0,
      Math.PI / 2,
    ]);
  }

  /** Wheel pair (both sides), axis along z. */
  wheelPair(r: number, x: number, color: number) {
    for (const z of [-0.72, 0.72]) {
      const w = this.add(
        new CylinderGeometry(r, r, 0.16, 8),
        this.mat(color, { roughness: 0.5, metalness: 0.4 }),
        x,
        r + 0.45,
        z,
        [Math.PI / 2, 0, 0],
      );
      // Hub
      const hub = new Mesh(new BoxGeometry(r * 1.2, 0.18, 0.18), this.mat(COLORS.locoBlack));
      this.owned.push(hub.geometry);
      w.add(hub);
      this.wheels.push({ mesh: w, radius: r });
    }
  }

  build(extra?: Partial<VehicleModel>): VehicleModel {
    const owned = this.owned;
    return {
      group: this.group,
      wheels: this.wheels,
      ...extra,
      dispose: () => owned.forEach((o) => o.dispose()),
    };
  }
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
  b.barrel(0.7, 2.9, COLORS.locoGreen, 0.55, 2.05, 0, 8, { roughness: 0.45, metalness: 0.15 });
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
  b.box(0.05, 0.6, 0.55, COLORS.window, -0.68, 2.65, 0.5, { roughness: 0.1, metalness: 0.5 });
  b.box(0.05, 0.6, 0.55, COLORS.window, -0.68, 2.65, -0.5, { roughness: 0.1, metalness: 0.5 });
  b.box(0.9, 0.55, 0.05, COLORS.window, -1.55, 2.7, 0.93, { roughness: 0.1, metalness: 0.5 });
  b.box(0.9, 0.55, 0.05, COLORS.window, -1.55, 2.7, -0.93, { roughness: 0.1, metalness: 0.5 });
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
  return b.build({ chimney: [2.2, 3.55, 0] });
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
