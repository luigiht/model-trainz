/**
 * Driving cab for the modern sets. The cab walls are an inward-facing, slightly inset copy of the
 * exterior loft (glazed faces left open), so they line up with the windows exactly.
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
}

// 1960s diesel: grey-green desk, cream dials, big brass-tipped power handle.
const LOOK = { panel: 0x56645f, body: 0x3e4744, accent: 0xc9a24a, seat: 0x4a3b2c, dial: 0xece6d6 };

const TILT = 0.55;

export function buildCab(spec: CabSpec): NonNullable<VehicleModel["cab"]> & { dispose(): void } {
  const b = new Builder();
  const [ex, ey, ez] = spec.eye;
  const look = LOOK;
  const floorY = spec.floorY ?? ey - 1.05;

  // Walls, ceiling and floor: the exterior shell inset a touch and seen from inside.
  const inset = spec.stations.map((s) => ({ x: s.x, w: (s.w ?? 1) * 0.965, h: (s.h ?? 1) * 0.985 }));
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
    { roughness: 0.85 },
    { backSide: true },
  );
  const x0 = spec.stations[0].x;
  const x1 = spec.stations[spec.stations.length - 1].x;
  b.box(x1 - x0 - 0.1, 0.04, 1.6, spec.floor, (x0 + x1) / 2, floorY, 0, { roughness: 0.9 });

  // Sloping desk in front of the driver.
  const dx = ex + 0.36;
  const dy = ey - 0.42;
  const cos = Math.cos(TILT);
  const sin = Math.sin(TILT);
  const on = (along: number, across: number, up = 0.02): [number, number, number] => [
    dx + cos * along - sin * up,
    dy + sin * along + cos * up,
    ez + across,
  ];
  const panel = b.box(0.34, 0.03, 0.95, look.panel, dx, dy, ez, { roughness: 0.6 });
  panel.rotation.z = TILT;
  b.box(0.34, dy - floorY, 1.0, look.body, dx + 0.05, (dy + floorY) / 2 - 0.05, ez, {
    roughness: 0.7,
  });
  b.box(0.08, 0.05, 1.0, look.body, dx + 0.18, dy + 0.11, ez); // desk top lip

  const needles: { mesh: Mesh; speed: boolean }[] = [];
  const needleMat = flatMaterial(0xd02020, { roughness: 0.5 });
  b.track(needleMat);
  const gauge = (along: number, across: number, r: number, face = look.dial, speed = false) => {
    const pivot = new Group();
    pivot.position.set(...on(along, across, 0.025));
    pivot.rotation.z = TILT;
    const rim = new Mesh(new CylinderGeometry(r, r, 0.03, 14), b.mat(0x15171a, { roughness: 0.4 }));
    const dial = new Mesh(new CylinderGeometry(r * 0.86, r * 0.86, 0.034, 14), b.mat(face));
    const needleGeo = new BoxGeometry(r * 0.8, 0.008, 0.012).translate(r * 0.38, 0, 0);
    const needle = new Mesh(needleGeo, needleMat);
    needle.position.y = 0.02;
    needle.rotation.y = 1.6;
    b.track(rim.geometry, dial.geometry, needleGeo);
    pivot.add(rim, dial, needle);
    b.group.add(pivot);
    needles.push({ mesh: needle, speed });
  };
  const lever = (along: number, across: number, len: number, knob: number, lean = -0.4) => {
    const [px, py, pz] = on(along, across, 0.02);
    const tx = -Math.sin(lean);
    const ty = Math.cos(lean);
    b.add(
      new CylinderGeometry(0.012, 0.012, len, 6),
      b.mat(0x1a1c1f),
      px + (tx * len) / 2,
      py + (ty * len) / 2,
      pz,
      [0, 0, lean],
    );
    b.box(0.05, 0.05, 0.05, knob, px + tx * len, py + ty * len, pz);
  };
  const button = (along: number, across: number, color: number) =>
    b.add(new CylinderGeometry(0.018, 0.018, 0.025, 8), b.mat(color, { emissive: color, emissiveIntensity: 0.4 }), ...on(along, across, 0.025), [0, 0, TILT]);

  gauge(0.02, -0.14, 0.07, look.dial, true); // speedometer
  gauge(0.02, 0.05, 0.05);
  gauge(0.02, 0.2, 0.05);
  gauge(-0.1, -0.32, 0.04);
  lever(-0.05, 0.36, 0.22, look.accent); // power controller
  lever(-0.05, -0.38, 0.18, 0x1a1c1f, -0.2); // brake
  button(-0.1, 0.12, 0xf2c200); // AWS acknowledge
  button(-0.1, 0.2, 0x2a9d3a);

  // Driver's seat, a sun blind at the top of the windscreen and a cab light.
  b.box(0.42, 0.08, 0.46, look.seat, ex - 0.12, floorY + 0.5, ez, { roughness: 0.9 });
  b.box(0.08, 0.6, 0.46, look.seat, ex - 0.36, floorY + 0.85, ez, { roughness: 0.9 });
  b.box(0.06, 0.04, 0.06, 0x3a3e44, ex - 0.12, floorY + 0.25, ez);
  b.box(0.04, 0.1, 0.55, 0x2a2622, ex + 0.5, ey + 0.32, ez, { roughness: 0.8 });
  b.box(0.12, 0.02, 0.12, 0xfff3d6, ex - 0.2, ey + 0.38, 0, {
    emissive: 0xfff3d6,
    emissiveIntensity: 0.6,
  });

  const built = b.build();
  return {
    group: built.group,
    update(speedFrac: number, t: number) {
      for (const n of needles)
        n.mesh.rotation.y = n.speed
          ? 2.1 - Math.min(1, speedFrac) * 4.2
          : 1.2 + Math.sin(t * 0.7 + n.mesh.id) * 0.05;
    },
    dispose: built.dispose,
  };
}
