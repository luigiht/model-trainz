/**
 * Low-poly station: platform, booking office with a gabled roof, canopy, lamps, bench and a
 * flower bed. Local frame: +x along the track, platform on the -z side (away from the camera so it
 * never hides the train). Origin = platform centre at rail-bed height.
 */
import {
  BoxGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  Shape,
  type BufferGeometry,
  type Material,
} from "three";
import { COLORS, flatMaterial } from "@/render/lowpoly";

export const PLATFORM_LENGTH = 14;

export interface StationModel {
  group: Group;
  dispose(): void;
}

export function buildStation(variant: number): StationModel {
  const group = new Group();
  const owned: (BufferGeometry | Material)[] = [];
  const mat = (c: number, o?: Parameters<typeof flatMaterial>[1]) => {
    const m = flatMaterial(c, o);
    owned.push(m);
    return m;
  };
  const add = (geo: BufferGeometry, m: Material, x: number, y: number, z: number, ry = 0) => {
    owned.push(geo);
    const mesh = new Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.rotation.y = ry;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const wallColors = [0xf0e2bf, 0xe8cfa4, 0xdfe6d8, 0xf2d7c4];
  const roofColors = [COLORS.roofRed, 0x4f6f8f, 0x6a8f4f, 0x8f5f9f];
  const walls = mat(wallColors[variant % wallColors.length]);
  const roof = mat(roofColors[variant % roofColors.length], { roughness: 0.7 });
  const stone = mat(COLORS.stone, { roughness: 1 });
  const wood = mat(COLORS.wood);
  const dark = mat(COLORS.locoBlack, { roughness: 0.5, metalness: 0.3 });

  // Platform with a light edge stripe.
  add(new BoxGeometry(PLATFORM_LENGTH, 0.75, 3.2), stone, 0, 0.1, -3.05);
  add(new BoxGeometry(PLATFORM_LENGTH, 0.06, 0.3), mat(0xf3d36b), 0, 0.5, -1.6);

  // Booking office: walls, gable infill, two pitched roof slabs and a ridge cap.
  const office = { x: -1, z: -6.4, w: 6, d: 3.4, top: 3.25 };
  add(new BoxGeometry(office.w, 2.8, office.d), walls, office.x, office.top - 1.4, office.z);
  const half = office.d / 2;
  const rise = 1.3;
  const gableShape = new Shape();
  gableShape.moveTo(-half, 0);
  gableShape.lineTo(half, 0);
  gableShape.lineTo(0, rise);
  gableShape.closePath();
  const gableGeo = new ExtrudeGeometry(gableShape, { depth: office.w, bevelEnabled: false });
  gableGeo.rotateY(Math.PI / 2).translate(-office.w / 2, 0, 0);
  add(gableGeo, walls, office.x, office.top, office.z);

  const pitch = Math.atan2(rise, half);
  const slope = Math.hypot(rise, half);
  const overhang = 0.45;
  const thick = 0.16;
  const slabLen = slope + overhang;
  const ridgeY = office.top + rise;
  for (const side of [1, -1]) {
    // Down-slope direction and outward normal for this side of the ridge.
    const dy = -Math.sin(pitch);
    const dz = Math.cos(pitch) * side;
    const ny = Math.cos(pitch);
    const nz = Math.sin(pitch) * side;
    const slab = add(
      new BoxGeometry(office.w + 0.6, thick, slabLen),
      roof,
      office.x,
      ridgeY + dy * (slabLen / 2) + ny * (thick / 2),
      office.z + dz * (slabLen / 2) + nz * (thick / 2),
    );
    slab.rotation.x = pitch * side;
  }
  const ridge = add(
    new BoxGeometry(office.w + 0.7, 0.16, 0.26),
    roof,
    office.x,
    ridgeY + 0.16,
    office.z,
  );
  ridge.rotation.x = Math.PI / 4;
  add(new BoxGeometry(0.6, 1.4, 0.6), mat(0xa0533f), 1.1, 4.6, -6.8); // chimney
  add(new BoxGeometry(1, 1.8, 0.08), wood, -1, 1.35, -4.66); // door
  const lit = mat(COLORS.windowLit, {
    emissive: COLORS.windowLit,
    emissiveIntensity: 0.5,
    roughness: 0.2,
  });
  for (const x of [-3, 1]) add(new BoxGeometry(1.1, 0.9, 0.08), lit, x, 2.1, -4.66);

  // Lean-to canopy: tucked under the office eave, falling gently towards the track.
  const canopyDrop = 0.3;
  const canopyDepth = 2.8;
  const canopy = add(
    new BoxGeometry(8.5, 0.16, Math.hypot(canopyDepth, canopyDrop)),
    roof,
    1.25,
    2.88,
    -3.3,
  );
  canopy.rotation.x = Math.atan2(canopyDrop, canopyDepth);
  for (const x of [-2.5, 1.5, 5])
    add(new CylinderGeometry(0.09, 0.09, 2.23, 6), dark, x, 1.585, -2.1);

  // Lamps.
  const lamp = mat(COLORS.lamp, { emissive: COLORS.lamp, emissiveIntensity: 3 });
  for (const x of [-6, 6]) {
    add(new CylinderGeometry(0.07, 0.1, 2.6, 6), dark, x, 1.8, -2.0);
    add(new BoxGeometry(0.35, 0.4, 0.35), lamp, x, 3.25, -2.0);
  }

  // Bench + flower bed for a bit of life.
  add(new BoxGeometry(1.6, 0.12, 0.5), wood, -4, 0.95, -3.9);
  add(new BoxGeometry(1.6, 0.5, 0.08), wood, -4, 1.2, -4.15);
  add(new BoxGeometry(2.4, 0.4, 0.8), mat(0x6e4c30), 4, 0.3, -8.6);
  const flowers = [0xe86a8a, 0xf2c94c, 0xffffff, 0xb57be8].map((c) => mat(c));
  for (let i = 0; i < 6; i++)
    add(
      new BoxGeometry(0.28, 0.28, 0.28),
      flowers[(i + variant) % 4],
      3.1 + i * 0.36,
      0.6,
      -8.6 + ((i % 2) - 0.5) * 0.3,
      i,
    );

  return { group, dispose: () => owned.forEach((o) => o.dispose()) };
}
