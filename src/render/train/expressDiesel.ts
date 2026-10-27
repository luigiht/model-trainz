/** Highland Express: a Type 3 double-cab hood unit with yellow noses, plus matching express coaches. */
import { BoxGeometry, CylinderGeometry } from "three";
import { Builder, scaleVehicle, type VehicleModel } from "./trainModels";
import { bodyStations, loft, within, withBreaks, type Face, type Station } from "./loft";
import { bogie } from "./bogies";
import { buildCab } from "./cabs";
import {
  DARK,
  GLASS,
  HW,
  ROUND_PROFILE,
  buffers,
  gangway,
  handrail,
  lamp,
  louvres,
  roofVents,
  step,
  underframe,
  wiper,
} from "./modernParts";

const YELLOW = 0xf2b51c;
const YELLOW_DEEP = 0xe0a312;
const SLATE = 0x474d55;
const SLATE_DOOR = 0x3d434b;
const ROOF = 0x3a3f46;
const PALE = 0xbcc1c5;
const BLUE = 0x2aa3d8;
const WHITE = 0xf1f2f0;
const ORANGE = 0xe8572a;
const WINDSCREEN = 0x3a5068;
const STEEL = { roughness: 0.6, metalness: 0.3 };

const LOCO_LEN = 8.0;
const COACH_LEN = 9.6;
/** Built at modern-stock proportions; scaled up so roof and nose line up with the heritage cab and boiler. */
const SCALE = 1.15;

/** Grey lower body with the white/blue stripe, slate above. */
function livery(y: number) {
  if (y < 1.3) return DARK;
  if (y < 1.86) return PALE;
  if (y < 1.99) return BLUE;
  if (y < 2.07) return WHITE;
  return SLATE;
}

const side = (f: Face) => Math.abs(f.nz) > 0.5;

/** Cab front (top of the raked windscreen) at ±CAB; the nose hood runs on to ±NOSE. */
const CAB = 2.85;
const NOSE = LOCO_LEN / 2;
const RAKE = 0.14;

function noseStations(dir: 1 | -1): Station[] {
  const s: Station[] = [
    { x: dir * CAB },
    { x: dir * (CAB + RAKE), w: 0.975, h: 0.69 },
    { x: dir * (NOSE - 0.35), w: 0.965, h: 0.665 },
    { x: dir * (NOSE - 0.12), w: 0.94, h: 0.63 },
    { x: dir * (NOSE - 0.03), w: 0.89, h: 0.6 },
    { x: dir * NOSE, w: 0.84, h: 0.57 },
  ];
  return dir > 0 ? s : s.reverse();
}

function noseDetails(b: Builder, dir: 1 | -1) {
  const x = (v: number) => dir * v;
  const glow = dir > 0;
  // Windscreen pillars on the raked cab front, and wipers.
  for (const z of [-0.3, 0.3])
    b.add(new BoxGeometry(0.04, 0.6, 0.05), b.mat(SLATE), x(CAB + RAKE / 2 + 0.01), 2.72, z, [
      0,
      0,
      dir * 0.245,
    ]);
  for (const z of [-0.55, 0, 0.55]) wiper(b, x(CAB + RAKE + 0.005), 2.55, z, dir, 0.6);
  // Nose hood: louvres on its flanks and a hatch on top.
  louvres(b, x(CAB + 0.62), 2.1, 0.62, 0.32, 8, true);
  b.box(0.4, 0.03, 0.5, 0x30343a, x(CAB + 0.6), 2.41, 0);
  // Headlight panel, centre lamp, marker lamps.
  b.box(0.04, 0.24, 0.9, YELLOW_DEEP, x(NOSE + 0.01), 1.95, 0);
  for (const z of [-0.3, 0.3]) lamp(b, x(NOSE + 0.04), 1.95, z, glow ? undefined : 0x553311);
  b.box(0.04, 0.18, 0.22, YELLOW_DEEP, x(NOSE + 0.01), 1.68, 0);
  lamp(b, x(NOSE + 0.04), 1.68, 0, glow ? undefined : 0x553311, 0.08);
  for (const z of [-0.52, 0.52]) {
    if (glow) b.barrel(0.06, 0.03, 0x7a1d22, x(NOSE + 0.02), 1.5, z, 10);
    else lamp(b, x(NOSE + 0.02), 1.5, z, 0xff3b30, 0.1);
  }
  // Buffer beam, buffers, coupling and yellow snowplough valances.
  b.box(0.14, 0.28, HW * 2, DARK, x(NOSE - 0.07), 1.06, 0, STEEL);
  buffers(b, x(NOSE), dir, 1.06);
  for (const [z, w] of [
    [-0.56, 0.42],
    [0, 0.3],
    [0.56, 0.42],
  ] as const)
    b.box(0.1, 0.34, w, YELLOW, x(NOSE - 0.08), 0.78, z, { roughness: 0.45 });
  // Brake and train-heating hoses either side of the coupling.
  for (const [z, c] of [
    [-0.28, 0xc62828],
    [-0.16, 0xe0b020],
    [0.16, 0xe0b020],
    [0.28, 0xc62828],
  ] as const)
    b.add(new CylinderGeometry(0.025, 0.025, 0.26, 6), b.mat(c), x(NOSE + 0.06), 0.93, z, [
      dir * 0.3,
      0,
      0,
    ]);
  b.box(0.06, 0.14, 0.1, 0x1a1c1f, x(NOSE + 0.04), 1.32, 0.66); // jumper socket
  step(b, x(CAB - 0.775));
  // Horns and an aerial on the cab roof.
  for (const z of [-0.22, 0.22]) {
    b.barrel(0.045, 0.24, 0x1a1c1f, x(CAB - 0.25), 3.0, z, 6);
    b.barrel(0.07, 0.04, 0x1a1c1f, x(CAB - 0.12), 3.0, z, 8);
  }
  b.box(0.02, 0.3, 0.02, 0x1a1c1f, x(NOSE - 0.2), 2.5, 0.6);
  for (const dx of [-0.98, -0.57]) handrail(b, x(CAB + dx), 1.5, 2.6);
}

/** Highland Express locomotive. */
export function buildExpressLoco(): VehicleModel {
  const b = new Builder();
  const profile = withBreaks(ROUND_PROFILE, [1.86, 1.99, 2.07, 2.42, 2.75, 2.79]);
  const cabWindow: [number, number] = [CAB - 0.45, CAB - 0.06];
  const door: [number, number] = [CAB - 0.95, CAB - 0.6];
  const doorWindow: [number, number] = [CAB - 0.88, CAB - 0.67];
  const cuts = [...cabWindow, ...door, ...doorWindow].flatMap((c) => [-c, c]);
  const body: Station[] = [
    ...noseStations(-1),
    ...cuts.sort((a, c) => a - c).map((x) => ({ x })),
    ...noseStations(1),
  ];
  loft(b, profile, body, (f) => {
    const ax = Math.abs(f.x);
    if (f.ny < -0.5) return DARK;
    if (ax > CAB && ax < CAB + RAKE + 0.001) {
      if (f.y > 2.86) return ROOF; // cab front: windscreen band between roof and nose
      return f.y > 2.5 && Math.abs(f.z) < 0.78 ? WINDSCREEN : f.y > 2.07 ? SLATE : livery(f.y);
    }
    if (ax > NOSE - 0.12) return f.y < 1.28 ? DARK : YELLOW;
    if (ax > CAB) return f.ny > 0.6 ? ROOF : livery(f.y); // nose hood
    if (f.y > 2.79 && f.ny > 0.35) return ROOF;
    const band = f.y > 2.42 && f.y < 2.75;
    if (side(f) && band && within(ax, [cabWindow, doorWindow])) return WINDSCREEN;
    if (side(f) && f.y > 2.75 && f.y < 2.79) return ORANGE;
    if (side(f) && within(ax, [door]) && f.y > 2.07) return SLATE_DOOR;
    return livery(f.y);
  });
  // Engine-room grilles, the big radiator fan and the underframe.
  louvres(b, -2.05, 2.32, 0.7, 0.5, 9, true);
  louvres(b, -0.95, 2.32, 0.9, 0.36, 11, true);
  louvres(b, 0.25, 2.32, 0.9, 0.36, 11, true);
  louvres(b, 1.35, 2.25, 0.45, 0.5, 5, true);
  b.box(0.95, 0.06, 0.75, 0x30343a, -2.0, 3.0, 0);
  b.add(new CylinderGeometry(0.36, 0.36, 0.06, 14), b.mat(0x1f2327), -2.0, 3.05, 0);
  for (const d of [-0.2, 0, 0.2]) {
    b.box(0.68, 0.02, 0.03, 0x5a6068, -2.0, 3.09, d);
    b.box(0.03, 0.02, 0.68, 0x5a6068, -2.0 + d, 3.09, 0);
  }
  b.box(1.4, 0.03, 0.4, 0x40464d, 0.5, 3.0, 0); // roof hatch
  b.box(2.2, 0.42, 1.4, 0x30343a, 0, 0.98, 0, STEEL); // fuel tank
  for (const z of [-0.45, 0.45]) b.barrel(0.11, 0.7, 0x3a3e44, 1.55, 0.98, z, 8);
  b.box(0.5, 0.3, 1.2, 0x23272b, -1.5, 1.04, 0, STEEL); // battery box
  for (const z of [-0.8, 0.8]) b.barrel(0.025, 4.0, 0x1d1f22, 0, 1.14, z, 6); // pipe runs
  for (let i = 0; i < 5; i++) b.box(0.03, 0.012, 0.6, 0x30343a, -1.2 + i * 0.7, 3.0, 0); // roof seams
  b.box(0.05, 0.06, 0.05, 0xc62828, -0.2, 2.2, HW + 0.005); // fire-equipment flap
  for (const dir of [1, -1] as const) noseDetails(b, dir);
  bogie(b, 2.5, "cp1");
  bogie(b, -2.5, "cp1");
  const eye: [number, number, number] = [CAB - 0.42, 2.66, -0.3];
  const cab = buildCab({
    profile,
    stations: [
      ...[CAB - 0.95, CAB - 0.88, CAB - 0.67, CAB - 0.6, CAB - 0.45, CAB - 0.06, CAB].map((x) => ({
        x,
      })),
      { x: CAB + RAKE, w: 0.975, h: 0.69 },
    ],
    isGlass: (f) =>
      (f.x > CAB && f.y > 2.5 && Math.abs(f.z) < 0.78) ||
      (side(f) && f.y > 2.42 && f.y < 2.75 && within(f.x, [cabWindow, doorWindow])),
    eye,
    wall: 0x7f8d86,
    ceiling: 0xd9d7cc,
    floor: 0x3a3a35,
  });
  b.group.add(cab.group);
  const model = b.build({
    chimney: [0.2, 3.05, 0],
    exhaust: "diesel",
    cabEye: eye,
    cab,
    length: LOCO_LEN,
    halfBase: 2.5,
  });
  const dispose = model.dispose;
  model.dispose = () => {
    dispose();
    cab.dispose();
  };
  return scaleVehicle(model, SCALE);
}

/** Highland Express coach: slate upper with flush windows, pale lower, stripes and end doors. */
export function buildExpressCoach(): VehicleModel {
  const b = new Builder();
  const half = COACH_LEN / 2;
  const profile = withBreaks(ROUND_PROFILE, [1.86, 1.99, 2.07, 2.22, 2.62, 2.7, 2.75]);
  const windows = Array.from({ length: 9 }, (_, i): [number, number] => {
    const c = -3.6 + i * 0.9;
    return [c - 0.33, c + 0.33];
  });
  const doors: [number, number][] = [
    [-4.55, -4.15],
    [4.15, 4.55],
  ];
  const doorWindows: [number, number][] = [
    [-4.43, -4.27],
    [4.27, 4.43],
  ];
  const cuts = [...windows, ...doors, ...doorWindows].flat();
  loft(b, profile, bodyStations(-half, half, cuts), (f) => {
    if (f.ny < -0.5) return DARK;
    if (Math.abs(f.nx) > 0.7) return f.y < 2.07 ? PALE : SLATE;
    if (f.y > 2.75 && f.ny > 0.3) return 0x3f4650;
    const band = f.y > 2.22 && f.y < 2.62;
    if (side(f) && band && (within(f.x, windows) || within(f.x, doorWindows))) return GLASS;
    if (side(f) && f.y > 2.7 && f.y < 2.75) return ORANGE;
    if (side(f) && within(f.x, doors) && f.y > 2.07) return SLATE_DOOR;
    return livery(f.y);
  });
  for (const dir of [1, -1] as const) {
    gangway(b, dir * half, dir);
    for (const dx of [4.12, 4.58]) handrail(b, dir * dx, 1.5, 2.3);
    b.box(0.03, 0.24, HW * 2 + 0.01, YELLOW, dir * 4.08, 2.42, 0);
    step(b, dir * 4.35);
    b.box(0.06, 0.025, HW * 2 + 0.03, 0xb8bcc1, dir * 4.2, 2.0, 0); // door handle
  }
  roofVents(b, -3.9, 3.9, 12, 3.0);
  for (const z of [-0.5, 0.5]) b.barrel(0.07, 0.4, 0x1d1f22, 1.2, 1.0, z, 8); // brake cylinders
  b.box(0.6, 0.32, 0.5, 0x23272b, -1.0, 1.03, -0.45, STEEL); // battery box
  underframe(b, -2.4, 2.4, 1);
  bogie(b, 3.4, "b4");
  bogie(b, -3.4, "b4");
  return scaleVehicle(b.build({ length: COACH_LEN, halfBase: 3.4 }), SCALE);
}
