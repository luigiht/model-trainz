/**
 * Driving cab for the modern sets. The cab walls are an inward-facing, slightly inset copy of the
 * exterior loft (glazed faces left open), so they line up with the windows exactly. Inside: the
 * driver's desk and instrument binnacle, the second man's desk, two seats and some cab clutter.
 */
import { BoxGeometry, CylinderGeometry, Group, Mesh } from "three";
import { flatMaterial } from "@/render/lowpoly";
import { Builder, type VehicleModel } from "./trainModels";
import { loft, type Face, type Profile, type Station } from "./loft";

export interface CabSpec {
  profile: Profile;
  /** Exterior stations spanning the cab, rear bulkhead first. */
  stations: Station[];
  /** Faces that are windows on the exterior (left open from inside). */
  isGlass: (f: Face) => boolean;
  eye: [number, number, number];
  wall: number;
  ceiling: number;
  floor: number;
  /** Height of the cab floor. */
  floorY?: number;
  /** Side windows (x ranges and sill/head heights), framed from inside. */
  windows?: { x: [number, number][]; y: [number, number] };
}

type MatOpts = Parameters<Builder["mat"]>[1];

// 1960s diesel: grey-green desks, dark instrument faces, cream dials, maroon moquette seats.
const LOOK = {
  console: 0x56645f,
  panel: 0x2c3431,
  dial: 0xf1ead8,
  bezel: 0x15171a,
  brass: 0xc9a24a,
  seat: 0x7a2f38,
  seatEdge: 0x5a2229,
  frame: 0x2b2f34,
  door: 0x6f7d76,
};
const STEEL = { roughness: 0.5, metalness: 0.4 };
/** Fake bounce light: the cab sits in the body's shadow, so its surfaces glow a little. */
const GLOW = 0.3;

interface Surface {
  x: number;
  y: number;
  z: number;
  tilt: number;
  length: number;
}

/** A desk face from `a` to `c` (side profile, x/y), centred across at `z`. */
const surface = (a: [number, number], c: [number, number], z: number): Surface => ({
  x: a[0],
  y: a[1],
  z,
  tilt: Math.atan2(c[1] - a[1], c[0] - a[0]),
  length: Math.hypot(c[0] - a[0], c[1] - a[1]),
});

/** Point on a surface: `along` its slope, `across` it, `up` off it. */
const at = (s: Surface, along: number, across: number, up = 0): [number, number, number] => [
  s.x + Math.cos(s.tilt) * along - Math.sin(s.tilt) * up,
  s.y + Math.sin(s.tilt) * along + Math.cos(s.tilt) * up,
  s.z + across,
];

export function buildCab(spec: CabSpec): NonNullable<VehicleModel["cab"]> & { dispose(): void } {
  const b = new Builder();
  const [ex, ey, ez] = spec.eye;
  const floorY = spec.floorY ?? ey - 1.07;
  const x0 = spec.stations[0].x;
  const x1 = spec.stations[spec.stations.length - 1].x;
  const lit = (c: number, o?: MatOpts): MatOpts => ({ emissive: c, emissiveIntensity: GLOW, ...o });
  const box = (
    w: number,
    h: number,
    d: number,
    c: number,
    x: number,
    y: number,
    z: number,
    o?: MatOpts,
  ) => b.box(w, h, d, c, x, y, z, lit(c, o));

  // Walls, ceiling and floor: the exterior shell inset a touch and seen from inside.
  const inset = spec.stations.map((s) => ({
    x: s.x,
    w: (s.w ?? 1) * 0.965,
    h: (s.h ?? 1) * 0.985,
  }));
  loft(
    b,
    spec.profile,
    inset,
    (f) => {
      if (spec.isGlass(f)) return null;
      if (f.ny < -0.5) return spec.floor;
      if (f.ny > 0.45) return spec.ceiling;
      return spec.wall;
    },
    { roughness: 0.85, emissive: 0x7d847a, emissiveIntensity: 0.25 },
    { backSide: true },
  );
  box(x1 - x0 - 0.06, 0.04, 1.74, spec.floor, (x0 + x1) / 2, floorY, 0, { roughness: 0.95 });

  // --- Consoles: side profiles extruded across the cab -------------------------------------
  const front = x1 - 0.02;
  const consoleBlock = (pts: [number, number][], z: number, width: number) => {
    b.prism(pts, width, LOOK.console, lit(LOOK.console, { roughness: 0.7 })).position.z = z;
  };
  const plate = (
    s: Surface,
    a0: number,
    a1: number,
    c0: number,
    c1: number,
    color: number,
    o?: MatOpts,
    thick = 0.012,
  ) => {
    box(
      a1 - a0,
      thick,
      c1 - c0,
      color,
      ...at(s, (a0 + a1) / 2, (c0 + c1) / 2, thick / 2),
      o,
    ).rotation.z = s.tilt;
  };

  // Driver's desk: a lectern of controls rising to the instrument binnacle under the windscreen.
  const zc = ez + 0.02;
  const d0: [number, number] = [ex + 0.23, ey - 0.44];
  const d1: [number, number] = [ex + 0.47, ey - 0.34];
  const d2: [number, number] = [ex + 0.59, ey - 0.15];
  consoleBlock([[d0[0], floorY], d0, d1, d2, [front, ey - 0.35], [front, floorY]], zc, 0.84);
  const desk = surface(d0, d1, zc);
  const binnacle = surface(d1, d2, zc);
  plate(desk, 0.01, desk.length - 0.01, -0.4, 0.4, LOOK.panel, { roughness: 0.6 });
  plate(binnacle, 0.005, binnacle.length - 0.005, -0.4, 0.4, LOOK.panel, { roughness: 0.6 });
  box(0.07, 0.03, 0.86, LOOK.frame, d2[0] - 0.01, d2[1] + 0.01, zc); // binnacle hood

  // Gauges: rims and faces merge into the cab mesh; only the needles move.
  const needles: { mesh: Mesh; kind: "speed" | "amps" | "idle" }[] = [];
  const needleMat = flatMaterial(0xd02020, { roughness: 0.5 });
  b.track(needleMat);
  const gauge = (s: Surface, along: number, across: number, r: number) => {
    const tilt: [number, number, number] = [0, 0, s.tilt];
    b.add(
      new CylinderGeometry(r, r, 0.024, 16),
      b.mat(LOOK.bezel, STEEL),
      ...at(s, along, across, 0.012),
      tilt,
    );
    b.add(
      new CylinderGeometry(r * 0.84, r * 0.84, 0.028, 16),
      b.mat(LOOK.dial, lit(LOOK.dial, { roughness: 0.5, emissiveIntensity: 0.5 })),
      ...at(s, along, across, 0.012),
      tilt,
    );
    b.add(
      new CylinderGeometry(r * 0.12, r * 0.12, 0.034, 8),
      b.mat(LOOK.bezel),
      ...at(s, along, across, 0.014),
      tilt,
    );
    const pivot = new Group();
    pivot.position.set(...at(s, along, across, 0.029));
    pivot.rotation.z = s.tilt;
    const geo = new BoxGeometry(r * 0.8, 0.006, r * 0.12).translate(r * 0.36, 0, 0);
    b.track(geo);
    const needle = new Mesh(geo, needleMat);
    needle.rotation.y = 1.6;
    pivot.add(needle);
    b.group.add(pivot);
    const entry = { mesh: needle, kind: "idle" as (typeof needles)[number]["kind"] };
    needles.push(entry);
    return entry;
  };
  gauge(binnacle, 0.11, 0, 0.07).kind = "speed";
  // Red overspeed mark at the top of the speedometer.
  plate(binnacle, 0.15, 0.16, -0.025, 0.025, 0xc62828, undefined, 0.032);
  gauge(binnacle, 0.1, -0.2, 0.045);
  gauge(binnacle, 0.1, -0.32, 0.045);
  gauge(binnacle, 0.1, 0.18, 0.045).kind = "amps";
  gauge(binnacle, 0.09, 0.3, 0.04);
  // Warning lights along the top of the binnacle (some lit).
  [0xf2b51c, 0x3a3f46, 0xd33a2c, 0x3fbf5a, 0x3a3f46, 0x3a8ee6].forEach((c, i) => {
    const across = -0.25 + i * 0.1;
    const on = c !== 0x3a3f46;
    plate(
      binnacle,
      0.18,
      0.205,
      across - 0.025,
      across + 0.025,
      c,
      {
        emissiveIntensity: on ? 1.6 : 0.1,
        roughness: 0.3,
      },
      0.016,
    );
  });
  // AWS "sunflower" indicator: yellow and black segments.
  plate(binnacle, 0.02, 0.07, 0.3, 0.36, 0x15171a, undefined, 0.016);
  plate(binnacle, 0.03, 0.045, 0.31, 0.33, 0xf2c200, { emissiveIntensity: 0.8 }, 0.02);
  plate(binnacle, 0.045, 0.06, 0.33, 0.35, 0xf2c200, { emissiveIntensity: 0.8 }, 0.02);

  // Desk controls: brake handle (left), power controller (right), reverser, buttons, switches.
  const lever = (along: number, across: number, len: number, knob: number) => {
    const mount = new Group();
    mount.position.set(...at(desk, along, across, 0.03));
    mount.rotation.z = desk.tilt;
    const arm = new Group();
    const stick = new CylinderGeometry(0.012, 0.014, len, 8).translate(0, len / 2, 0);
    const grip = new CylinderGeometry(0.026, 0.026, 0.07, 10)
      .rotateX(Math.PI / 2)
      .translate(0, len, 0);
    b.track(stick, grip);
    arm.add(
      new Mesh(stick, b.mat(0x1a1c1f, lit(0x1a1c1f, STEEL))),
      new Mesh(grip, b.mat(knob, lit(knob, { roughness: 0.3, metalness: 0.6 }))),
    );
    mount.add(arm);
    b.group.add(mount);
    return arm;
  };
  for (const across of [-0.3, 0.28]) {
    box(0.13, 0.05, 0.1, LOOK.frame, ...at(desk, 0.13, across, 0.025), STEEL).rotation.z =
      desk.tilt;
    plate(desk, 0.08, 0.18, across - 0.008, across + 0.008, 0x0c0d0e, undefined, 0.052); // gate
  }
  const brakeArm = lever(0.13, -0.3, 0.13, 0xb3392f);
  const powerArm = lever(0.13, 0.28, 0.15, LOOK.brass);
  box(0.06, 0.05, 0.06, LOOK.frame, ...at(desk, 0.07, 0.13, 0.025), STEEL).rotation.z = desk.tilt;
  box(0.02, 0.06, 0.03, LOOK.brass, ...at(desk, 0.07, 0.13, 0.07), {
    metalness: 0.8,
    roughness: 0.3,
  }).rotation.z = desk.tilt; // reverser key
  (
    [
      [0.06, -0.14, 0xf2c200],
      [0.06, -0.05, 0x2a9d3a],
      [0.06, 0.03, 0xc62828],
    ] as const
  ).forEach(([along, across, c]) =>
    b.add(
      new CylinderGeometry(0.018, 0.018, 0.02, 10),
      b.mat(c, lit(c, { emissiveIntensity: 0.6 })),
      ...at(desk, along, across, 0.018),
      [0, 0, desk.tilt],
    ),
  );
  for (let i = 0; i < 5; i++) {
    const across = -0.16 + i * 0.06;
    box(0.03, 0.012, 0.03, LOOK.frame, ...at(desk, 0.21, across, 0.012)).rotation.z = desk.tilt;
    box(0.008, 0.03, 0.008, 0xc9ccd0, ...at(desk, 0.21, across, 0.03), STEEL).rotation.z =
      desk.tilt + (i % 2 ? 0.4 : -0.4); // toggle switch
  }

  // Second man's desk: lower, with a radio handset, the logbook and a mug of tea.
  const zs = 0.44;
  const s0: [number, number] = [ex + 0.33, ey - 0.5];
  const s1: [number, number] = [ex + 0.6, ey - 0.38];
  const sTop = ey - 0.42;
  consoleBlock([[s0[0], floorY], s0, s1, [front, sTop], [front, floorY]], zs, 0.8);
  const mate = surface(s0, s1, zs);
  plate(mate, 0.01, mate.length - 0.01, -0.36, 0.36, LOOK.panel, { roughness: 0.6 });
  gauge(mate, 0.15, 0.2, 0.04);
  for (let i = 0; i < 4; i++)
    plate(
      mate,
      0.08,
      0.1,
      -0.3 + i * 0.07,
      -0.27 + i * 0.07,
      i === 1 ? 0x3fbf5a : 0x3a3f46,
      {
        emissiveIntensity: i === 1 ? 1.4 : 0.1,
      },
      0.016,
    );
  const topX = (s1[0] + front) / 2;
  const topY = (s1[1] + sTop) / 2;
  box(0.12, 0.04, 0.2, 0x1d1f22, topX - 0.04, topY + 0.03, zs - 0.22, { roughness: 0.6 }); // radio
  box(0.05, 0.03, 0.16, 0x2b2f34, topX - 0.04, topY + 0.065, zs - 0.22); // handset
  box(0.15, 0.025, 0.2, 0xe9dfc4, topX, topY + 0.02, zs + 0.06, { roughness: 0.9 }); // logbook
  box(0.15, 0.027, 0.02, 0x7a2f38, topX, topY + 0.021, zs - 0.03); // its spine
  b.add(
    new CylinderGeometry(0.032, 0.028, 0.08, 12),
    b.mat(0xf3efe6, lit(0xf3efe6, { roughness: 0.4 })),
    topX - 0.02,
    topY + 0.05,
    zs + 0.27,
  ); // mug
  b.add(
    new CylinderGeometry(0.027, 0.027, 0.004, 12),
    b.mat(0x6b3f22),
    topX - 0.02,
    topY + 0.087,
    zs + 0.27,
  );
  box(0.012, 0.045, 0.012, 0xf3efe6, topX - 0.06, topY + 0.05, zs + 0.27);

  // --- Seats --------------------------------------------------------------------------------
  const seat = (x: number, z: number) => {
    box(0.3, 0.03, 0.3, LOOK.frame, x, floorY + 0.015, z, STEEL);
    b.add(
      new CylinderGeometry(0.035, 0.05, 0.36, 10),
      b.mat(LOOK.frame, lit(LOOK.frame, STEEL)),
      x,
      floorY + 0.21,
      z,
    );
    box(0.4, 0.04, 0.4, LOOK.frame, x, floorY + 0.4, z, STEEL);
    box(0.44, 0.08, 0.44, LOOK.seat, x + 0.01, floorY + 0.46, z, { roughness: 0.95 });
    box(0.06, 0.06, 0.44, LOOK.seatEdge, x + 0.22, floorY + 0.455, z, { roughness: 0.95 });
    box(0.08, 0.5, 0.42, LOOK.seat, x - 0.2, floorY + 0.76, z, { roughness: 0.95 }).rotation.z =
      0.12;
    box(0.09, 0.05, 0.44, LOOK.seatEdge, x - 0.235, floorY + 1.02, z, {
      roughness: 0.95,
    }).rotation.z = 0.12;
    for (const dz of [-0.08, 0.08])
      box(0.015, 0.1, 0.015, 0xb8bcc1, x - 0.25, floorY + 1.08, z + dz, STEEL);
    box(0.07, 0.15, 0.28, LOOK.seat, x - 0.26, floorY + 1.18, z, { roughness: 0.95 }).rotation.z =
      0.12;
    for (const s of [-1, 1]) {
      box(0.3, 0.04, 0.06, LOOK.seatEdge, x - 0.03, floorY + 0.66, z + s * 0.25, {
        roughness: 0.9,
      });
      box(0.03, 0.2, 0.03, LOOK.frame, x - 0.14, floorY + 0.55, z + s * 0.25, STEEL);
    }
  };
  seat(ex - 0.05, ez);
  seat(ex, zs);

  // --- Walls: window frames, an elbow rest, the engine-room door, extinguisher, sun visors --
  const hw = 0.875;
  if (spec.windows) {
    const [y0, y1] = spec.windows.y;
    for (const [a, c] of spec.windows.x)
      for (const s of [-1, 1]) {
        box(c - a + 0.07, 0.035, 0.05, LOOK.frame, (a + c) / 2, y0 - 0.017, s * hw);
        box(c - a + 0.07, 0.035, 0.05, LOOK.frame, (a + c) / 2, y1 + 0.017, s * (hw - 0.03));
        for (const x of [a - 0.017, c + 0.017])
          box(0.035, y1 - y0, 0.05, LOOK.frame, x, (y0 + y1) / 2, s * (hw - 0.01));
      }
  }
  box(0.42, 0.04, 0.1, LOOK.console, ex + 0.12, (spec.windows?.y[0] ?? 2.42) - 0.06, -hw + 0.04);
  box(0.025, 1.2, 0.6, LOOK.door, x0 + 0.015, floorY + 0.62, 0.15, { roughness: 0.7 });
  box(0.03, 0.3, 0.3, 0x55687a, x0 + 0.02, floorY + 0.95, 0.15, { roughness: 0.2 });
  box(0.05, 0.025, 0.1, LOOK.brass, x0 + 0.04, floorY + 0.6, -0.08, {
    metalness: 0.8,
    roughness: 0.3,
  });
  b.add(
    new CylinderGeometry(0.05, 0.05, 0.32, 10),
    b.mat(0xc62828, lit(0xc62828, { roughness: 0.4 })),
    x0 + 0.07,
    floorY + 0.3,
    -0.62,
  );
  box(0.03, 0.06, 0.03, 0x1a1c1f, x0 + 0.07, floorY + 0.49, -0.62);
  for (const z of [-0.4, 0.4])
    box(0.012, 0.09, 0.34, 0x4d4337, ex + 0.46, ey + 0.2, z, { roughness: 0.6 }).rotation.z = 1.2;
  box(0.18, 0.02, 0.12, 0xfff3d6, ex + 0.15, ey + 0.28, 0, { emissiveIntensity: 0.9 }); // cab light

  const built = b.build();
  built.group.traverse((o) => {
    o.castShadow = false;
  });
  let last = 0;
  let power = 0;
  let brake = 1;
  return {
    group: built.group,
    update(speedFrac: number, t: number) {
      const dt = Math.min(0.1, Math.max(0, t - last));
      last = t;
      const moving = speedFrac > 0.02;
      const k = 1 - Math.exp(-dt * 4);
      power += ((moving ? Math.min(1, 0.4 + speedFrac) : 0) - power) * k;
      brake += ((moving ? 0 : 1) - brake) * k;
      powerArm.rotation.z = 0.35 - power * 0.8;
      brakeArm.rotation.z = -0.3 + brake * 0.6;
      for (const n of needles)
        n.mesh.rotation.y =
          n.kind === "speed"
            ? 2.1 - Math.min(1, speedFrac) * 4.2
            : n.kind === "amps"
              ? 2.1 - power * 3 + Math.sin(t * 9) * 0.03 * power
              : 1.2 + Math.sin(t * 0.7 + n.mesh.id) * 0.05;
    },
    dispose: built.dispose,
  };
}
