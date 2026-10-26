"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Matrix4,
  PerspectiveCamera,
  Quaternion,
  Vector3,
  type DirectionalLight,
  type Object3D,
} from "three";
import { game } from "@/game/state/game";
import { railheadS } from "@/game/simulation/rules";
import type { RoutePoint } from "@/game/simulation/route";
import { useSettingsStore } from "@/game/state/settingsStore";
import { CAB_EYE } from "@/render/train/cabInterior";
import { damp } from "@/lib/math";
import { trainFx } from "./trainFx";

const OFFSET = new Vector3(-16, 30, 38);
const SUN = new Vector3(28, 46, 14);
const DIORAMA_FOV = 30;
const CAB_FOV = 62;
const TRANSITION_SECONDS = 1.2;

const p: RoutePoint = { x: 0, y: 0, z: 0, dx: 1, dy: 0, dz: 0 };
const desired = new Vector3();
const target = new Vector3();
const dioPos = new Vector3();
const dioQuat = new Quaternion();
const cabPos = new Vector3();
const cabQuat = new Quaternion();
const lookAt = new Vector3();
const m = new Matrix4();
const UP = new Vector3(0, 1, 0);
const shadowFocus = new Vector3();
const qLook = new Quaternion();
const AXIS_X = new Vector3(1, 0, 0);

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * Two cameras, one rig:
 *  - Diorama: isometric-style narrow-FOV follow camera. Docked, it frames the platform and the
 *    stretch ahead where new pieces land; traveling, it follows the train. Wheel zooms.
 *  - Cab: first person from the driver's position, looking down the line, with gentle head bob.
 *    Drag (or arrow keys) to look around — see `trainFx.cabLook`, written by <GameRoot/>.
 * Switching blends position, orientation and FOV over ~1.2 s. The sun's shadow frustum follows.
 */
export function CameraRig({
  sun,
  reducedMotion,
}: {
  sun: React.RefObject<DirectionalLight | null>;
  reducedMotion: boolean;
}) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const zoom = useRef(1.15);
  const initialised = useRef(false);
  const progress = useRef(useSettingsStore.getState().cameraMode === "cab" ? 1 : 0);
  const look = useRef({ yaw: 0, pitch: 0 });

  useEffect(() => {
    const el = gl.domElement;
    const onWheel = (e: WheelEvent) => {
      if (useSettingsStore.getState().cameraMode !== "diorama") return;
      e.preventDefault();
      zoom.current = Math.min(1.8, Math.max(0.45, zoom.current * (1 + Math.sign(e.deltaY) * 0.1)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
    };
  }, [gl]);

  useFrame((_, dt) => {
    const s = game.state;
    const wantCab = useSettingsStore.getState().cameraMode === "cab";

    // --- Diorama pose -----------------------------------------------------------------------
    const lookAhead =
      s.phase === "docked" ? 4 + Math.min(railheadS(s.laid) - s.trainS, 20) * 0.25 : 6;
    game.route.pointAt(s.trainS + lookAhead, p);
    desired.set(p.x, p.y, p.z);
    if (!initialised.current) {
      target.copy(desired);
      initialised.current = true;
    }
    target.lerp(desired, damp(3, dt));
    dioPos.copy(target).addScaledVector(OFFSET, zoom.current);
    if (!reducedMotion) dioPos.y += trainFx.jolt * 0.25;
    m.lookAt(dioPos, target, UP);
    dioQuat.setFromRotationMatrix(m);

    // --- Cab pose ---------------------------------------------------------------------------
    const loco = trainFx.loco;
    if (loco) {
      loco.updateMatrixWorld();
      cabPos.set(...CAB_EYE);
      if (!reducedMotion) {
        const bob = Math.min(1, s.trainV / 5);
        cabPos.y += Math.sin(s.stats.distance * 2.2) * 0.025 * bob + trainFx.jolt * 0.03;
        cabPos.z += Math.sin(s.stats.distance * 1.1) * 0.015 * bob;
      }
      loco.localToWorld(cabPos);
      // Look down the line ahead of the train, then apply the (eased) drag look-around.
      game.route.pointAt(s.trainS + 40, p);
      lookAt.set(p.x, p.y - 1.5, p.z);
      m.lookAt(cabPos, lookAt, UP);
      cabQuat.setFromRotationMatrix(m);
      const k = damp(4, dt);
      const goal = trainFx.cabLook;
      const k2 = reducedMotion ? 1 : Math.min(1, k * 3);
      look.current.yaw += (goal.yaw - look.current.yaw) * k2;
      look.current.pitch += (goal.pitch - look.current.pitch) * k2;
      cabQuat.multiply(qLook.setFromAxisAngle(UP, look.current.yaw));
      cabQuat.multiply(qLook.setFromAxisAngle(AXIS_X, look.current.pitch));
    } else {
      cabPos.copy(dioPos);
      cabQuat.copy(dioQuat);
    }

    // --- Blend ------------------------------------------------------------------------------
    const step = reducedMotion ? 1 : dt / TRANSITION_SECONDS;
    progress.current = Math.min(1, Math.max(0, progress.current + (wantCab ? step : -step)));
    const t = easeInOut(progress.current);
    trainFx.cabBlend = t;
    camera.position.lerpVectors(dioPos, cabPos, t);
    // Arc upward mid-transition so the camera swoops instead of clipping through scenery.
    camera.position.y += Math.sin(Math.PI * t) * 6;
    camera.quaternion.slerpQuaternions(dioQuat, cabQuat, t);
    const fov = DIORAMA_FOV + (CAB_FOV - DIORAMA_FOV) * t;
    const near = t > 0.6 ? 0.08 : 1;
    if (camera.fov !== fov || camera.near !== near) {
      camera.fov = fov;
      camera.near = near;
      camera.updateProjectionMatrix();
    }

    // --- Sun / shadow frustum follows what we're looking at ----------------------------------
    const light = sun.current;
    if (light) {
      shadowFocus.lerpVectors(target, cabPos, t);
      if (t > 0.5) {
        // In the cab, centre shadows a little ahead of the driver.
        game.route.pointAt(s.trainS + 18, p);
        shadowFocus.set(p.x, p.y, p.z);
      }
      light.position.copy(shadowFocus).add(SUN);
      light.target.position.copy(shadowFocus);
      (light.target as Object3D).updateMatrixWorld();
    }
  });

  return null;
}
