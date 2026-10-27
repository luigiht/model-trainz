/**
 * Evergreen Express: a double-cab mainline diesel and modern coaches in the heritage colours (loco
 * green, cream, maroon, gold lining, red buffer beams and wheels), so it belongs with the steam set.
 */
import { BoxGeometry, Color, CylinderGeometry } from "three";
import { COLORS } from "@/render/lowpoly";
import { Builder, scaleVehicle, type VehicleModel } from "./trainModels";
import {
  bodyStations,
  loft,
  within,
  withBreaks,
  type Face,
  type Profile,
  type Station,
} from "./loft";
import { bogie } from "./bogies";
import { buildCab } from "./cabs";
import {
  DARK,
  HW,
  LAMP,
  ROUND_PROFILE,
  TAIL,
  buffers,
  gangway,
  handrail,
  lamp,
  louvres,
  roofVents,
  step,
  underframe,
} from "./modernParts";

const GREEN = COLORS.locoGreen;
const GREEN_DOOR = 0x286b45;
const CREAM = COLORS.cream;
const CREAM_DOOR = 0xe2d1a8;
const GOLD = COLORS.brass;
const RED = COLORS.wheelRed;
const ROOF = 0x2c2f33;
const WINDSCREEN = 0x2e4252;
const BRASS = { roughness: 0.3, metalness: 1 };
const STEEL = { roughness: 0.6, metalness: 0.3 };

const LOCO_LEN = 8.2;
const COACH_LEN = 9.6;
/** Built at modern-stock proportions; scaled up so the roof lines up with the heritage cab. */
const SCALE = 1.15;

const side = (f: Face) => Math.abs(f.nz) > 0.5;
const ACROSS: [number, number, number] = [Math.PI / 2, 0, 0];

// --- Locomotive ---------------------------------------------------------------------------------

/** The bodyside is two shells: a full-length lower one and the cab tops above WAIST, so the
 * windscreens can rake back over a vertical nose. */
const WAIST = 2.3;
const END = LOCO_LEN / 2;
const SCREEN_TOP = END - 0.5;
const SCREEN_FOOT = END - 0.24;
/** Windscreen rake from vertical (it drops 0.42 over its depth). */
const RAKE = Math.atan2(SCREEN_FOOT - SCREEN_TOP, 0.42);
const CAB_WINDOW: [number, number] = [END - 1.05, END - 0.68];
const DOOR: [number, number] = [END - 1.52, END - 1.12];
const DOOR_WINDOW: [number, number] = [END - 1.44, END - 1.2];

const LOWER: Profile = withBreaks(
  [...ROUND_PROFILE.filter(([, y]) => y < WAIST), [HW, WAIST]],
  [1.86, 1.91, 2.05, 2.1],
);
const UPPER: Profile = withBreaks(
  [[HW, WAIST], ...ROUND_PROFILE.filter(([, y]) => y > WAIST)],
  [2.42, 2.75],
);

/** Stations given for the front end (+x), mirrored for the rear; ascending x either way. */
const ends = (dir: 1 | -1, s: Station[]) =>
  dir > 0 ? s : s.map((r) => ({ ...r, x: -r.x })).reverse();

/** Lower shell: full height to the cab front, then rounded off in plan. */
const noseFoot = (dir: 1 | -1) =>
  ends(dir, [{ x: END - 0.2 }, { x: END - 0.07, w: 0.975 }, { x: END, w: 0.93, h: 0.985 }]);

/** Cab top: a small brow, the raked windscreen, then a sill. */
const cabTop = (dir: 1 | -1) =>
  ends(dir, [
    { x: END - 0.62 },
    { x: SCREEN_TOP, h: 0.9 },
    { x: SCREEN_FOOT, h: 0.3 },
    { x: END - 0.2, h: 0.1 },
  ]);

/** Loco green with a cream waistband between gold lines, black valance below. */
function locoLivery(y: number) {
  if (y < 1.3) return DARK;
  if (y < 1.86 || y > 2.1) return GREEN;
  return y < 1.91 || y > 2.05 ? GOLD : CREAM;
}

function paintLoco(f: Face): number | null {
  const ax = Math.abs(f.x);
  const ahead = f.nx * Math.sign(f.x);
  // Lower shell's top, hidden under the cab tops (and inside the cabs).
  if (f.ny > 0.9 && Math.abs(f.y - WAIST) < 0.01 && ax < END - 0.2) return null;
  if (f.ny < -0.5) return f.y > WAIST - 0.1 ? null : DARK; // cab shell's hidden underside
  if (f.y > WAIST && ax > SCREEN_TOP && ax < SCREEN_FOOT)
    return ahead > 0.3 && Math.abs(f.z) < 0.8 ? WINDSCREEN : GREEN;
  if (ax > SCREEN_FOOT) return f.y > WAIST - 0.05 ? GREEN : locoLivery(f.y);
  if (ahead > 0.3) return GREEN; // brow over the windscreen
  if (f.y > 2.8 && f.ny > 0.35) return ROOF;
  if (side(f) && f.y > 2.42 && f.y < 2.75 && within(ax, [CAB_WINDOW, DOOR_WINDOW]))
    return WINDSCREEN;
  if (side(f) && within(ax, [DOOR]) && f.y > 1.3 && (f.y < 1.86 || f.y > 2.1)) return GREEN_DOOR;
  return locoLivery(f.y);
}

/** Brass ring with a coloured centre, on both sides (axis across the body) or facing ±x. */
function roundel(
  b: Builder,
  x: number,
  y: number,
  z: number,
  r: number,
  centre: number,
  along?: 1 | -1,
) {
  if (along) {
    b.barrel(r, 0.03, GOLD, x + along * 0.015, y, z, 14, BRASS);
    b.barrel(r * 0.7, 0.035, centre, x + along * 0.02, y, z, 14, { roughness: 0.2 });
    return;
  }
  b.add(new CylinderGeometry(r, r, HW * 2 + 0.03, 14), b.mat(GOLD, BRASS), x, y, z, ACROSS);
  b.add(
    new CylinderGeometry(r * 0.72, r * 0.72, HW * 2 + 0.04, 14),
    b.mat(centre, { roughness: 0.2 }),
    x,
    y,
    z,
    ACROSS,
  );
}

function cabEnd(b: Builder, dir: 1 | -1) {
  const x = (v: number) => dir * v;
  const lead = dir > 0;
  // Centre pillar and wipers lying on the raked windscreen.
  const mid = (SCREEN_TOP + SCREEN_FOOT) / 2;
  b.add(new BoxGeometry(0.03, 0.5, 0.07), b.mat(GREEN), x(mid + 0.012), 2.72, 0, [
    0,
    0,
    dir * RAKE,
  ]);
  for (const z of [-0.42, 0.42])
    b.box(0.012, 0.3, 0.018, 0x111214, x(END - 0.3), 2.62, z).rotation.set(
      dir * Math.sign(z) * 0.5,
      0,
      dir * RAKE,
      "ZYX",
    );
  // Brass-rimmed lamps (white leading, red trailing), a top marker lamp and the crest.
  for (const z of [-0.55, 0.55]) {
    b.barrel(0.1, 0.03, GOLD, x(END + 0.01), 1.55, z, 12, BRASS);
    lamp(b, x(END + 0.03), 1.55, z, lead ? LAMP : TAIL);
  }
  b.barrel(0.07, 0.03, GOLD, x(END + 0.01), 2.18, 0, 12, BRASS);
  lamp(b, x(END + 0.03), 2.18, 0, lead ? LAMP : 0x553311, 0.08);
  roundel(b, x(END), 1.62, 0, 0.12, RED, dir);
  // Red buffer beam, buffers, hoses and a black snowplough.
  b.box(0.14, 0.3, HW * 2, RED, x(END - 0.07), 1.05, 0, { roughness: 0.5 });
  buffers(b, x(END), dir, 1.06);
  for (const [z, w] of [
    [-0.56, 0.42],
    [0, 0.3],
    [0.56, 0.42],
  ] as const)
    b.box(0.1, 0.34, w, COLORS.locoBlack, x(END - 0.08), 0.78, z, STEEL);
  for (const [z, c] of [
    [-0.24, 0xc62828],
    [0.24, 0xe0b020],
  ] as const)
    b.add(new CylinderGeometry(0.025, 0.025, 0.26, 6), b.mat(c), x(END + 0.06), 0.93, z, [
      0,
      0,
      dir * 0.3,
    ]);
  // Cab door: step, brass grab rails, and brass horns on the cab roof.
  step(b, x(END - 1.32));
  for (const dx of [1.55, 1.09]) handrail(b, x(END - dx), 1.5, 2.6, HW, GOLD);
  for (const z of [-0.22, 0.22]) {
    b.barrel(0.045, 0.24, GOLD, x(END - 0.92), 3.03, z, 6, BRASS);
    b.barrel(0.07, 0.04, GOLD, x(END - 0.78), 3.03, z, 8, BRASS);
  }
}

/** Evergreen Express locomotive. */
export function buildEvergreenLoco(): VehicleModel {
  const b = new Builder();
  const cuts = [...CAB_WINDOW, ...DOOR, ...DOOR_WINDOW]
    .flatMap((c) => [-c, c])
    .sort((p, q) => p - q)
    .map((x) => ({ x }));
  loft(b, LOWER, [...noseFoot(-1), ...cuts, ...noseFoot(1)], paintLoco);
  loft(b, UPPER, [...cabTop(-1), ...cuts, ...cabTop(1)], paintLoco);

  // Engine room: green louvred grilles, brass portholes and a crest on each side.
  for (const s of [-1, 1]) {
    louvres(b, s * 1.95, 2.47, 0.8, 0.34, 10, true, 0x1c3a29, 0x3d8a5c);
    louvres(b, s * 1.0, 2.47, 0.7, 0.34, 9, true, 0x1c3a29, 0x3d8a5c);
  }
  for (const x of [-0.28, 0.28]) roundel(b, x, 2.48, 0, 0.13, WINDSCREEN);
  roundel(b, 0, 1.6, 0, 0.16, RED);
  // Roof: radiator fan, exhaust stack, hatch and seams.
  b.box(0.95, 0.06, 0.8, 0x23272b, -1.95, 3.0, 0);
  b.add(new CylinderGeometry(0.36, 0.36, 0.06, 14), b.mat(0x1a1d20), -1.95, 3.05, 0);
  for (const d of [-0.2, 0, 0.2]) {
    b.box(0.68, 0.02, 0.03, 0x5a6068, -1.95, 3.09, d);
    b.box(0.03, 0.02, 0.68, 0x5a6068, -1.95 + d, 3.09, 0);
  }
  b.add(new CylinderGeometry(0.09, 0.11, 0.14, 8), b.mat(0x1a1c1f, STEEL), 0.6, 3.04, 0);
  b.box(1.1, 0.03, 0.45, 0x34383d, 1.55, 3.0, 0);
  for (let i = 0; i < 4; i++) b.box(0.03, 0.012, 0.6, 0x34383d, -1.2 + i * 0.6, 3.0, 0);
  // Underframe: fuel tank, battery box, air tanks and pipe runs.
  b.box(2.0, 0.42, 1.4, 0x30343a, -0.1, 0.98, 0, STEEL);
  b.box(0.4, 0.3, 1.2, 0x23272b, 1.05, 1.04, 0, STEEL);
  for (const z of [-0.8, 0.8]) b.barrel(0.025, 4.0, 0x1d1f22, 0, 1.14, z, 6);
  for (const dir of [1, -1] as const) cabEnd(b, dir);
  bogie(b, 2.6, "cp1", RED);
  bogie(b, -2.6, "cp1", RED);

  const eye: [number, number, number] = [END - 1.05, 2.68, -0.42];
  const cab = buildCab({
    profile: withBreaks(ROUND_PROFILE, [WAIST, 2.42, 2.75]),
    stations: [
      ...[DOOR[0], DOOR_WINDOW[0], DOOR_WINDOW[1], DOOR[1], ...CAB_WINDOW, END - 0.62].map((x) => ({
        x,
      })),
      { x: SCREEN_TOP, h: 0.96 },
      { x: SCREEN_FOOT - 0.02, h: 0.72 },
    ],
    isGlass: (f) =>
      (f.x > SCREEN_TOP && f.x < SCREEN_FOOT - 0.03 && f.nx > 0.3 && Math.abs(f.z) < 0.78) ||
      (side(f) && f.y > 2.42 && f.y < 2.75 && within(f.x, [CAB_WINDOW, DOOR_WINDOW])),
    eye,
    wall: 0x9aa892,
    ceiling: 0xeee4cc,
    floor: 0x34352f,
    windows: { x: [CAB_WINDOW, DOOR_WINDOW], y: [2.42, 2.75] },
  });
  b.group.add(cab.group);
  const model = b.build({
    chimney: [0.6, 3.1, 0],
    exhaust: "diesel",
    cabEye: eye,
    cab,
    length: LOCO_LEN,
    halfBase: 2.6,
  });
  const dispose = model.dispose;
  model.dispose = () => {
    dispose();
    cab.dispose();
  };
  return scaleVehicle(model, SCALE);
}

// --- Coaches ------------------------------------------------------------------------------------

/** Maroon (or green) below a gold line, cream above, like the heritage carriages. */
function coachLivery(y: number, lower: number) {
  if (y < 1.3) return DARK;
  if (y < 2.08) return lower;
  return y < 2.13 ? GOLD : CREAM;
}

/** Evergreen Express coach: rounded modern body, warm lit flush windows, plug doors at the ends. */
export function buildEvergreenCoach(index: number): VehicleModel {
  const b = new Builder();
  const half = COACH_LEN / 2;
  const lower = index % 2 === 0 ? COLORS.maroon : GREEN;
  const lowerDoor = new Color(lower).multiplyScalar(0.85).getHex();
  const profile = withBreaks(ROUND_PROFILE, [2.08, 2.13, 2.25, 2.65]);
  const windows = Array.from({ length: 8 }, (_, i): [number, number] => {
    const c = (i - 3.5) * 0.98;
    return [c - 0.36, c + 0.36];
  });
  const doors: [number, number][] = [
    [-4.6, -4.2],
    [4.2, 4.6],
  ];
  const glazing: [number, number][] = [...windows, [-4.5, -4.3], [4.3, 4.5]];
  const stations = bodyStations(-half, half, [...glazing, ...doors].flat());
  const glazed = (f: Face) => side(f) && f.y > 2.25 && f.y < 2.65 && within(f.x, glazing);
  loft(b, profile, stations, (f) => {
    if (glazed(f)) return null;
    if (f.ny < -0.5) return DARK;
    if (f.y > 2.8 && f.ny > 0.3) return ROOF;
    const c = coachLivery(f.y, lower);
    if (!side(f) || !within(f.x, doors)) return c;
    return c === lower ? lowerDoor : c === CREAM ? CREAM_DOOR : c;
  });
  loft(b, profile, stations, (f) => (glazed(f) ? COLORS.windowLit : null), {
    roughness: 0.2,
    emissive: COLORS.windowLit,
    emissiveIntensity: 0.35,
  });
  for (const dir of [1, -1] as const) {
    gangway(b, dir * half, dir);
    for (const dx of [4.17, 4.63]) handrail(b, dir * dx, 1.5, 2.3, HW, GOLD);
    step(b, dir * 4.4);
    b.box(0.06, 0.025, HW * 2 + 0.03, GOLD, dir * 4.25, 2.0, 0, BRASS); // door handle
  }
  roofVents(b, -3.9, 3.9, 12, 3.0);
  for (const z of [-0.5, 0.5]) b.barrel(0.07, 0.4, 0x1d1f22, 1.2, 1.0, z, 8); // brake cylinders
  b.box(0.6, 0.32, 0.5, 0x23272b, -1.0, 1.03, -0.45, STEEL); // battery box
  underframe(b, -2.4, 2.4, index);
  bogie(b, 3.4, "b4");
  bogie(b, -3.4, "b4");
  return scaleVehicle(b.build({ length: COACH_LEN, halfBase: 3.4 }), SCALE);
}
