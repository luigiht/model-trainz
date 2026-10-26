/**
 * Low-poly cab interior for the first-person Cab view, in locomotive-local space (+x forward). The
 * exterior cab box is single-sided, so from inside it's invisible; these interior pieces give the
 * cab its walls, window frames, gauges, lever, firebox and lantern.
 */
import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  type BufferGeometry,
  type Material,
  type MeshStandardMaterial,
} from "three";
import { COLORS, flatMaterial } from "@/render/lowpoly";

/** Driver's eye, in loco-local space: right side of the cab, peering past the boiler. */
export const CAB_EYE: [number, number, number] = [-2.05, 2.78, 0.45];

export interface CabInterior {
  group: Group;
  pressureNeedle: Group;
  speedNeedle: Group;
  regulator: Group;
  lantern: Group;
  fireMaterial: MeshStandardMaterial;
  dispose(): void;
}

export function buildCabInterior(): CabInterior {
  const group = new Group();
  group.name = "cab-interior";
  const owned: (BufferGeometry | Material)[] = [];
  const mat = (c: number, o?: Parameters<typeof flatMaterial>[1]) => {
    const m = flatMaterial(c, o);
    owned.push(m);
    return m;
  };
  const box = (
    parent: Group,
    w: number,
    h: number,
    d: number,
    m: Material,
    x: number,
    y: number,
    z: number,
  ) => {
    const g = new BoxGeometry(w, h, d);
    owned.push(g);
    const mesh = new Mesh(g, m);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  const wall = mat(0x4f8a62, { roughness: 0.6 });
  const trim = mat(0x2a2d31, { roughness: 0.5, metalness: 0.3 });
  const brass = mat(COLORS.brass, { roughness: 0.3, metalness: 1 });
  const wood = mat(COLORS.wood, { roughness: 0.8 });
  const face = mat(0xf3ead2, { roughness: 0.6 });
  const fireMaterial = mat(0xff8a2a, {
    emissive: 0xff6a10,
    emissiveIntensity: 2.5,
  }) as MeshStandardMaterial;

  // Front wall (backhead) with two windows: lower panel, top rail, centre mullion, side posts.
  const FX = -0.76;
  box(group, 0.06, 1.05, 1.84, wall, FX, 1.9, 0);
  box(group, 0.06, 0.28, 1.84, wall, FX, 3.1, 0);
  box(group, 0.06, 0.6, 0.42, wall, FX, 2.7, 0);
  for (const z of [0.84, -0.84]) box(group, 0.06, 0.6, 0.16, wall, FX, 2.7, z);
  // Window frames.
  for (const z of [0.48, -0.48]) {
    box(group, 0.08, 0.05, 0.56, trim, FX - 0.02, 2.42, z);
    box(group, 0.08, 0.05, 0.56, trim, FX - 0.02, 2.98, z);
  }
  // Side walls up to the windows, roof, floor.
  for (const z of [0.88, -0.88]) {
    box(group, 1.7, 1.05, 0.05, wall, -1.6, 1.9, z);
    box(group, 1.7, 0.06, 0.12, trim, -1.6, 2.44, z); // sill
  }
  box(group, 1.9, 0.06, 1.84, wood, -1.6, 3.22, 0); // roof boards
  box(group, 1.7, 0.05, 1.8, wood, -1.6, 1.4, 0);

  // Firebox door with glow.
  box(group, 0.08, 0.38, 0.5, trim, FX - 0.05, 1.7, 0);
  box(group, 0.04, 0.26, 0.36, fireMaterial, FX - 0.1, 1.7, 0);

  // Gauges facing the driver.
  const gauge = (z: number, y: number) => {
    const g = new Group();
    g.position.set(FX - 0.06, y, z);
    const rim = new CylinderGeometry(0.15, 0.15, 0.05, 10);
    const dial = new CylinderGeometry(0.125, 0.125, 0.052, 10);
    owned.push(rim, dial);
    const r = new Mesh(rim, brass);
    const d = new Mesh(dial, face);
    r.rotation.z = Math.PI / 2;
    d.rotation.z = Math.PI / 2;
    d.position.x = -0.004;
    g.add(r, d);
    const needle = new Group();
    needle.position.x = -0.035;
    box(needle, 0.01, 0.1, 0.016, mat(0xc0302a), 0, 0.045, 0);
    g.add(needle);
    group.add(g);
    return needle;
  };
  const pressureNeedle = gauge(0.42, 2.27);
  const speedNeedle = gauge(0.05, 2.27);

  // Regulator (throttle) lever pivoting from the backhead.
  const regulator = new Group();
  regulator.position.set(FX - 0.08, 2.05, 0.6);
  box(regulator, 0.05, 0.42, 0.05, brass, 0, 0.2, 0);
  box(regulator, 0.08, 0.08, 0.14, wood, 0, 0.42, 0);
  group.add(regulator);

  // Hanging lantern that swings with acceleration.
  const lantern = new Group();
  lantern.position.set(-1.05, 3.19, -0.55);
  box(lantern, 0.015, 0.22, 0.015, trim, 0, -0.11, 0);
  box(lantern, 0.12, 0.16, 0.12, brass, 0, -0.3, 0);
  box(
    lantern,
    0.08,
    0.1,
    0.08,
    mat(COLORS.lamp, { emissive: COLORS.lamp, emissiveIntensity: 2.5 }),
    0,
    -0.3,
    0,
  );
  group.add(lantern);

  return {
    group,
    pressureNeedle,
    speedNeedle,
    regulator,
    lantern,
    fireMaterial,
    dispose: () => owned.forEach((o) => o.dispose()),
  };
}
