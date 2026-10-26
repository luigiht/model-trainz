"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Matrix4, Quaternion, Vector3 } from "three";
import { game, useHud } from "@/game/state/game";
import type { RoutePoint } from "@/game/simulation/route";
import {
  CARRIAGE_LENGTH,
  COUPLING_GAP,
  LOCO_LENGTH,
  buildCarriage,
  buildLocomotive,
  type VehicleModel,
} from "@/render/train/trainModels";
import { trainFx } from "./trainFx";

const front: RoutePoint = { x: 0, y: 0, z: 0, dx: 1, dy: 0, dz: 0 };
const back: RoutePoint = { x: 0, y: 0, z: 0, dx: 1, dy: 0, dz: 0 };
const fwd = new Vector3();
const side = new Vector3();
const up = new Vector3();
const basis = new Matrix4();
const WORLD_UP = new Vector3(0, 1, 0);
const q = new Quaternion();

/** Places a vehicle between two bogie points sampled on the route (articulates on curves). */
function placeVehicle(group: Group, centerS: number, halfBase: number, sway: number) {
  game.route.pointAt(centerS + halfBase, front);
  game.route.pointAt(centerS - halfBase, back);
  fwd.set(front.x - back.x, front.y - back.y, front.z - back.z).normalize();
  side.crossVectors(fwd, WORLD_UP).normalize();
  up.crossVectors(side, fwd).normalize();
  basis.makeBasis(fwd, up, side);
  q.setFromRotationMatrix(basis);
  group.position.set((front.x + back.x) / 2, (front.y + back.y) / 2, (front.z + back.z) / 2);
  group.quaternion.copy(q);
  group.rotateX(sway);
}

export function Train() {
  const carriages = useHud((s) => s.stats.carriages);
  const loco = useMemo(() => buildLocomotive(), []);
  const cars = useMemo<VehicleModel[]>(
    () => Array.from({ length: carriages }, (_, i) => buildCarriage(i)),
    [carriages],
  );

  useEffect(() => () => loco.dispose(), [loco]);
  useEffect(() => () => cars.forEach((c) => c.dispose()), [cars]);

  useFrame(({ clock }, dt) => {
    const { state } = game;
    const t = clock.elapsedTime;
    const speed = state.trainV;
    // Tiny speed-dependent rocking plus the click "jolt" impulse.
    const sway = Math.sin(t * 7.3) * 0.004 * Math.min(1, speed / 4) + trainFx.jolt * 0.02;
    trainFx.jolt *= Math.exp(-dt * 10);

    const locoCenter = state.trainS - LOCO_LENGTH / 2;
    placeVehicle(loco.group, locoCenter, 1.6, sway);
    let s = state.trainS - LOCO_LENGTH - COUPLING_GAP;
    cars.forEach((car, i) => {
      placeVehicle(
        car.group,
        s - CARRIAGE_LENGTH / 2,
        1.4,
        Math.sin(t * 6.1 + i) * 0.004 * Math.min(1, speed / 4),
      );
      s -= CARRIAGE_LENGTH + COUPLING_GAP;
    });

    // Wheels roll with distance travelled.
    const dist = state.stats.distance;
    for (const v of [loco, ...cars]) for (const w of v.wheels) w.mesh.rotation.y = -dist / w.radius;

    // Chimney position for the steam system.
    if (loco.chimney) {
      trainFx.chimney.set(...loco.chimney);
      loco.group.localToWorld(trainFx.chimney);
    }
  });

  return (
    <group>
      <primitive object={loco.group} />
      {cars.map((c, i) => (
        <primitive key={i} object={c.group} />
      ))}
    </group>
  );
}
