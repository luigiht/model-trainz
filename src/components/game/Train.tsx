"use client";

import { useEffect, useMemo } from "react";
import { CAB_EYE, buildCabInterior } from "@/render/train/cabInterior";
import { deriveStats } from "@/game/economy/economy";
import { useFrame } from "@react-three/fiber";
import { game, useHud } from "@/game/state/game";
import {
  CARRIAGE_LENGTH,
  COUPLING_GAP,
  LOCO_LENGTH,
  type VehicleModel,
} from "@/render/train/trainModels";
import { placeOnRoute } from "@/render/train/placement";
import { TRAIN_SET_MODELS } from "@/render/train/trainSetModels";
import { trainFx } from "./trainFx";

let lastSpeed = 0;
let lanternVel = 0;

export function Train() {
  const carriages = useHud((s) => s.stats.carriages);
  const trainSet = useHud((s) => s.trainSet);
  const models = TRAIN_SET_MODELS[trainSet];
  const loco = useMemo(() => models.loco(), [models]);
  const cars = useMemo<VehicleModel[]>(
    () => Array.from({ length: carriages }, (_, i) => models.coach(i)),
    [models, carriages],
  );
  // Only the heritage engine has a modelled footplate; the others look out of their windscreen.
  const steamCab = !loco.cabEye;

  const cab = useMemo(() => buildCabInterior(), []);

  useEffect(() => {
    if (steamCab) loco.group.add(cab.group);
    trainFx.loco = loco.group;
    trainFx.cabEye.set(...(loco.cabEye ?? CAB_EYE));
    trainFx.exhaust = loco.exhaust ?? null;
    return () => {
      loco.group.remove(cab.group);
      trainFx.loco = null;
      loco.dispose();
    };
  }, [loco, cab, steamCab]);
  useEffect(() => () => cab.dispose(), [cab]);
  useEffect(() => () => cars.forEach((c) => c.dispose()), [cars]);

  useFrame(({ clock }, dt) => {
    const { state } = game;
    const t = clock.elapsedTime;
    const speed = state.trainV;
    // Tiny speed-dependent rocking plus the click "jolt" impulse.
    const sway = Math.sin(t * 7.3) * 0.004 * Math.min(1, speed / 4) + trainFx.jolt * 0.02;
    trainFx.jolt *= Math.exp(-dt * 10);

    const locoLength = loco.length ?? LOCO_LENGTH;
    placeOnRoute(game.route, loco.group, state.trainS - locoLength / 2, loco.halfBase ?? 1.6, sway);
    let s = state.trainS - locoLength - COUPLING_GAP;
    cars.forEach((car, i) => {
      const length = car.length ?? CARRIAGE_LENGTH;
      placeOnRoute(
        game.route,
        car.group,
        s - length / 2,
        car.halfBase ?? 1.4,
        Math.sin(t * 6.1 + i) * 0.004 * Math.min(1, speed / 4),
      );
      s -= length + COUPLING_GAP;
    });

    // Cab interior: only drawn when the cab camera is (partly) active.
    const inCab = trainFx.cabBlend > 0.01;
    if (loco.cab) {
      loco.cab.group.visible = inCab;
      if (inCab) loco.cab.update(speed / deriveStats(state.levels, state.trainSet).maxSpeed, t);
    }
    cab.group.visible = steamCab && inCab;
    if (cab.group.visible) {
      const maxSpeed = deriveStats(state.levels, state.trainSet).maxSpeed;
      trainFx.pressure = Math.max(0.15, trainFx.pressure - dt * 0.08);
      const ease = 1 - Math.exp(-dt * 6);
      cab.pressureNeedle.rotation.x +=
        (-(trainFx.pressure * 4.2 - 2.1) - cab.pressureNeedle.rotation.x) * ease;
      cab.speedNeedle.rotation.x +=
        (-((speed / maxSpeed) * 4.2 - 2.1) - cab.speedNeedle.rotation.x) * ease;
      cab.regulator.rotation.z = state.phase === "traveling" ? -0.7 : 0.15;
      // Lantern swings against acceleration, with a little damping wobble.
      const accel = (speed - lastSpeed) / Math.max(dt, 1e-3);
      lanternVel += (-accel * 0.06 - cab.lantern.rotation.z * 18) * dt - lanternVel * dt * 2.5;
      cab.lantern.rotation.z += lanternVel * dt * 10;
      cab.fireMaterial.emissiveIntensity =
        2 + Math.sin(t * 13) * 0.4 + Math.sin(t * 29) * 0.3 + trainFx.pressure;
    }
    lastSpeed = speed;

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
      <primitive key={trainSet} object={loco.group} />
      {cars.map((c, i) => (
        <primitive key={`${trainSet}-${i}`} object={c.group} />
      ))}
    </group>
  );
}
