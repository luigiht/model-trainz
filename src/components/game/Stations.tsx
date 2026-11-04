"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { ConeGeometry, Matrix4, MeshStandardMaterial, Vector3, type Group, type Mesh } from "three";
import { game, useHud } from "@/game/state/game";
import { stationS } from "@/game/simulation/rules";
import type { RoutePoint } from "@/game/simulation/route";
import { PLATFORM_SECTION } from "@/game/content/upgrades";
import { smoothstep } from "@/lib/math";
import {
  PLATFORM_LENGTH,
  buildPlatformExtension,
  buildStation,
  type StationModel,
} from "@/render/world/stationModel";

const a: RoutePoint = { x: 0, y: 0, z: 0, dx: 1, dy: 0, dz: 0 };
const fwd = new Vector3();
const side = new Vector3();
const up = new Vector3();
const basis = new Matrix4();
const WORLD_UP = new Vector3(0, 1, 0);
const straight = new Vector3();
const onLine = new Vector3();
/** Over this distance the extension eases from the station's straight box onto the curving line. */
const EASE_LENGTH = 8;

function placeStation(group: Group, k: number) {
  placeAt(group, stationS(k) - PLATFORM_LENGTH / 2);
}

/** Stand `group` level on the line at arc length s, +x along the track. */
function placeAt(group: Group, s: number) {
  game.route.pointAt(s, a);
  // Keep buildings level: orient by the horizontal direction only.
  fwd.set(a.dx, 0, a.dz).normalize();
  side.crossVectors(fwd, WORLD_UP).normalize();
  up.copy(WORLD_UP);
  basis.makeBasis(fwd, up, side);
  group.position.set(a.x, a.y, a.z);
  group.quaternion.setFromRotationMatrix(basis);
}

function StationInstance({ index, sections }: { index: number; sections: number }) {
  const model = useMemo<StationModel>(() => {
    const m = buildStation(index);
    placeStation(m.group, index);
    return m;
  }, [index]);
  useEffect(() => () => model.dispose(), [model]);
  // Longer Platforms: one swept slab from the platform's rear end, following the curve.
  const extension = useMemo(() => {
    const station = model.group;
    const bFwd = new Vector3(1, 0, 0).applyQuaternion(station.quaternion);
    const bSide = new Vector3(0, 0, 1).applyQuaternion(station.quaternion);
    const rear = stationS(index) - PLATFORM_LENGTH;
    return buildPlatformExtension(sections * PLATFORM_SECTION, (u, d, h, out) => {
      // The station's box continued straight, and the same offsets taken from the line itself.
      straight
        .copy(station.position)
        .addScaledVector(bFwd, -PLATFORM_LENGTH / 2 - u)
        .addScaledVector(bSide, d);
      straight.y += h;
      game.route.pointAt(rear - u, a);
      const n = Math.hypot(a.dx, a.dz);
      onLine.set(a.x - (a.dz / n) * d, a.y + h, a.z + (a.dx / n) * d);
      return out.lerpVectors(straight, onLine, smoothstep(0, EASE_LENGTH, u));
    });
  }, [model, index, sections]);
  useEffect(() => () => extension.dispose(), [extension]);
  return (
    <>
      <primitive object={model.group} />
      {sections > 0 && <primitive object={extension.group} />}
    </>
  );
}

/** The previous, current and next two stations, plus a bouncing marker over the active one. */
export function Stations() {
  const station = useHud((s) => s.station);
  const sections = useHud((s) => s.stats.platformSections);
  const docked = useHud((s) => s.phase === "docked");
  const marker = useRef<Mesh>(null);
  const markerRes = useMemo(
    () => ({
      geo: new ConeGeometry(0.6, 1.3, 4),
      mat: new MeshStandardMaterial({
        color: 0xffd34d,
        emissive: 0xffb020,
        emissiveIntensity: 1.4,
        flatShading: true,
      }),
    }),
    [],
  );
  useEffect(
    () => () => {
      markerRes.geo.dispose();
      markerRes.mat.dispose();
    },
    [markerRes],
  );
  const indices = [station - 1, station, station + 1, station + 2].filter((k) => k >= 0);

  useFrame(({ clock }) => {
    const m = marker.current;
    if (!m) return;
    const s = game.state;
    m.visible = s.phase === "docked";
    if (!m.visible) return;
    game.route.pointAt(stationS(s.station) - PLATFORM_LENGTH / 2, a);
    // Above the platform canopy (local z = -3.1; the side vector is (-dz, 0, dx)).
    m.position.set(
      a.x + a.dz * 3.1,
      a.y + 5.6 + Math.sin(clock.elapsedTime * 3) * 0.35,
      a.z - a.dx * 3.1,
    );
    m.rotation.set(Math.PI, clock.elapsedTime * 1.5, 0);
  });

  return (
    <group>
      {indices.map((k) => (
        <StationInstance key={k} index={k} sections={sections} />
      ))}
      <mesh ref={marker} geometry={markerRes.geo} material={markerRes.mat} visible={docked} />
    </group>
  );
}
