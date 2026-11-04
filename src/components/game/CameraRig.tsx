"use client";

import { useEffect, useMemo, useRef } from "react";
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
import { useSettingsStore, type CameraMode } from "@/game/state/settingsStore";
import { damp } from "@/lib/math";
import { LOCO_LENGTH } from "@/render/train/trainModels";
import { TerrainField } from "@/render/world/terrain";
import { ChaseRig, CinematicDirector, type CameraPose } from "./cameraShots";
import { trainFx, zoomChase } from "./trainFx";

const OFFSET = new Vector3(-16, 30, 38);
const OFFSET_LENGTH = OFFSET.length();
const SUN = new Vector3(28, 46, 14);
const DIORAMA_FOV = 30;
const CAB_FOV = 62;
const TRANSITION_SECONDS = 1.2;
/** The diorama frame is always at least this wide (half-width) at the train: loco plus margin. */
const MIN_HALF_WIDTH = 8.5;

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
const focus = new Vector3();
const qLook = new Quaternion();
const AXIS_X = new Vector3(1, 0, 0);
const pose: CameraPose = { pos: new Vector3(), look: new Vector3(), fov: DIORAMA_FOV };
const goalPos = new Vector3();
const goalQuat = new Quaternion();
const fromPos = new Vector3();
const fromQuat = new Quaternion();

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * One rig, four views:
 *  - Diorama: isometric-style narrow-FOV follow camera. Docked, it frames the platform and the
 *    stretch ahead where new pieces land; traveling, it follows the train. Wheel zooms.
 *  - Chase: third-person orbit around the train (drag / arrows orbit, wheel zooms); see cameraShots.
 *  - Cab: first person from the driver's position, looking down the line, with gentle head bob.
 *    Drag (or arrow keys) to look around — see `trainFx.cabLook`, written by <GameRoot/>.
 *  - Cinematic: an automatic director cutting between film-style shots; see cameraShots.
 * Switching blends from the old view to the new one over ~1.2 s; cinematic shots hard-cut. The
 * sun's shadow frustum follows what the camera looks at.
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
  const look = useRef({ yaw: 0, pitch: 0 });
  // Blend from the pose we left (`fromPos/fromQuat/fromFov`) into the current view's live pose.
  const view = useRef<{ mode: CameraMode; prev: CameraMode; blend: number; fromFov: number }>({
    mode: useSettingsStore.getState().cameraMode,
    prev: useSettingsStore.getState().cameraMode,
    blend: 1,
    fromFov: DIORAMA_FOV,
  });
  const seed = game.state.seed;
  // Main-thread terrain heights, so the free cameras stay above the ground and tunnel hills.
  const field = useMemo(() => new TerrainField(seed), [seed]);
  const chase = useMemo(() => new ChaseRig(), []);
  const director = useMemo(() => new CinematicDirector(), []);

  useEffect(() => {
    const el = gl.domElement;
    const onWheel = (e: WheelEvent) => {
      const mode = useSettingsStore.getState().cameraMode;
      if (mode !== "diorama" && mode !== "chase") return;
      e.preventDefault();
      const factor = 1 + Math.sign(e.deltaY) * 0.1;
      if (mode === "chase") zoomChase(factor);
      else zoom.current = Math.min(1.8, Math.max(0.45, zoom.current * factor));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
    };
  }, [gl]);

  useFrame((_, dt) => {
    const s = game.state;
    const { trainS, distance } = game.view;
    const v = view.current;
    const mode = useSettingsStore.getState().cameraMode;
    if (mode !== v.mode) {
      v.prev = v.mode;
      v.mode = mode;
      v.blend = 0;
      v.fromFov = camera.fov;
      fromPos.copy(camera.position);
      fromQuat.copy(camera.quaternion);
      if (mode === "chase") chase.reset();
    }

    // --- Diorama pose -----------------------------------------------------------------------
    const ahead = s.phase === "docked" ? 4 + Math.min(railheadS(s.laid) - trainS, 20) * 0.25 : 6;
    // 0 on landscape screens, 1 on tall phone screens: those centre on the engine itself.
    const narrow = Math.min(1, Math.max(0, (1.2 - camera.aspect) / 0.7));
    const lookAhead = ahead + (1 - LOCO_LENGTH / 2 - ahead) * narrow;
    game.route.pointAt(trainS + lookAhead, p);
    desired.set(p.x, p.y, p.z);
    if (!initialised.current) {
      target.copy(desired);
      initialised.current = true;
    }
    target.lerp(desired, damp(3, dt));
    // Back off on narrow screens until the frame is wide enough for the whole locomotive.
    const halfWidth =
      OFFSET_LENGTH * zoom.current * Math.tan((DIORAMA_FOV * Math.PI) / 360) * camera.aspect;
    const fit = Math.max(1, MIN_HALF_WIDTH / halfWidth);
    dioPos.copy(target).addScaledVector(OFFSET, zoom.current * fit);
    if (!reducedMotion) dioPos.y += trainFx.jolt * 0.25;
    m.lookAt(dioPos, target, UP);
    dioQuat.setFromRotationMatrix(m);

    // --- Cab pose ---------------------------------------------------------------------------
    const loco = trainFx.loco;
    if (loco) {
      loco.updateMatrixWorld();
      cabPos.copy(trainFx.cabEye);
      if (!reducedMotion) {
        const bob = Math.min(1, s.trainV / 5);
        cabPos.y += Math.sin(distance * 2.2) * 0.025 * bob + trainFx.jolt * 0.03;
        cabPos.z += Math.sin(distance * 1.1) * 0.015 * bob;
      }
      loco.localToWorld(cabPos);
      // Look down the line ahead of the train, then apply the (eased) drag look-around.
      game.route.pointAt(trainS + 40, p);
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

    // --- This view's live pose, and what the sun's shadows should centre on -------------------
    let fov = DIORAMA_FOV;
    let cut = false;
    if (mode === "cab") {
      goalPos.copy(cabPos);
      goalQuat.copy(cabQuat);
      fov = CAB_FOV;
      // Centre shadows a little ahead of the driver.
      game.route.pointAt(trainS + 18, p);
      focus.set(p.x, p.y, p.z);
    } else if (mode === "chase" || mode === "cinematic") {
      if (mode === "chase") chase.update(dt, game.route, field, trainS, reducedMotion, pose);
      else {
        const shotState = { trainS, trainV: s.trainV, station: s.station };
        director.update(dt, game.route, field, shotState, reducedMotion, pose);
        cut = director.cut && v.blend >= 1;
      }
      goalPos.copy(pose.pos);
      m.lookAt(pose.pos, pose.look, UP);
      goalQuat.setFromRotationMatrix(m);
      fov = pose.fov;
      focus.copy(pose.look);
    } else {
      goalPos.copy(dioPos);
      goalQuat.copy(dioQuat);
      focus.copy(target);
    }

    // --- Blend from the previous view -------------------------------------------------------
    v.blend = reducedMotion ? 1 : Math.min(1, v.blend + dt / TRANSITION_SECONDS);
    const t = easeInOut(v.blend);
    trainFx.cabBlend = mode === "cab" ? t : v.prev === "cab" ? 1 - t : 0;
    camera.position.lerpVectors(fromPos, goalPos, t);
    // Arc upward mid-transition so the camera swoops instead of clipping through scenery.
    camera.position.y += Math.sin(Math.PI * t) * 6;
    camera.quaternion.slerpQuaternions(fromQuat, goalQuat, t);
    fov = v.fromFov + (fov - v.fromFov) * t;
    const near = trainFx.cabBlend > 0.6 ? 0.08 : mode === "diorama" ? 1 : 0.5;
    if (camera.fov !== fov || camera.near !== near) {
      camera.fov = fov;
      camera.near = near;
      camera.updateProjectionMatrix();
    }

    // --- Sun / shadow frustum follows what we're looking at ----------------------------------
    const light = sun.current;
    if (light) {
      if (cut || shadowFocus.lengthSq() === 0) shadowFocus.copy(focus);
      else shadowFocus.lerp(focus, damp(5, dt));
      light.position.copy(shadowFocus).add(SUN);
      light.target.position.copy(shadowFocus);
      (light.target as Object3D).updateMatrixWorld();
    }
  });

  return null;
}
