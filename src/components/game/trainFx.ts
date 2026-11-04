import { Vector3, type Object3D } from "three";

export const CHASE_DEFAULTS = { pitch: 0.42, distance: 18 };
export const CHASE_LIMITS = { pitchMin: 0.05, pitchMax: 1.25, distanceMin: 8, distanceMax: 34 };

/** Mutable effect state shared between the train, steam and camera (never React state). */
export const trainFx = {
  /** World position of the chimney top, updated every frame by <Train/>. */
  chimney: new Vector3(),
  /** Decaying impulse added on each click (body jolt / camera nudge). */
  jolt: 0,
  /** Puffs requested by events, consumed by <Steam/>. */
  pendingPuffs: 0,
  /** Boiler "pressure" 0–1 for the cab gauge: rises with clicks, slowly bleeds off. */
  pressure: 0,
  /** The locomotive's root object, for the cab camera. */
  loco: null as Object3D | null,
  /** Driver's eye in locomotive-local space (depends on the train set in service). */
  cabEye: new Vector3(),
  /** What the locomotive's chimney emits; null for electrics. */
  exhaust: "steam" as "steam" | "diesel" | null,
  /** Cab-view look offset from straight ahead (radians), driven by drag / arrow keys. */
  cabLook: { yaw: 0, pitch: 0 },
  /** 0 = outside camera, 1 = cab camera (blended during transitions). */
  cabBlend: 0,
  /**
   * Chase-view orbit around the train: yaw from directly behind (radians, + = to the train's left),
   * pitch above the horizon, distance. `idle` counts seconds since the player last moved it.
   */
  chase: { yaw: 0, pitch: CHASE_DEFAULTS.pitch, distance: CHASE_DEFAULTS.distance, idle: 0 },
};

export const CAB_LOOK_LIMITS = { yaw: 1.9, pitchUp: 0.5, pitchDown: -0.7 };

/** Rotate the cab view by a delta (radians), clamped to what a driver could turn their head to. */
export function nudgeCabLook(dYaw: number, dPitch: number) {
  const l = trainFx.cabLook;
  l.yaw = Math.max(-CAB_LOOK_LIMITS.yaw, Math.min(CAB_LOOK_LIMITS.yaw, l.yaw + dYaw));
  l.pitch = Math.max(
    CAB_LOOK_LIMITS.pitchDown,
    Math.min(CAB_LOOK_LIMITS.pitchUp, l.pitch + dPitch),
  );
}

export function resetCabLook() {
  trainFx.cabLook.yaw = 0;
  trainFx.cabLook.pitch = 0;
}

/** Orbit the chase camera by a delta (radians); yaw wraps, pitch stays above the ground. */
export function nudgeChase(dYaw: number, dPitch: number) {
  const c = trainFx.chase;
  c.yaw = Math.atan2(Math.sin(c.yaw + dYaw), Math.cos(c.yaw + dYaw));
  c.pitch = Math.max(CHASE_LIMITS.pitchMin, Math.min(CHASE_LIMITS.pitchMax, c.pitch + dPitch));
  c.idle = 0;
}

export function zoomChase(factor: number) {
  const c = trainFx.chase;
  c.distance = Math.max(
    CHASE_LIMITS.distanceMin,
    Math.min(CHASE_LIMITS.distanceMax, c.distance * factor),
  );
  c.idle = 0;
}

export function resetChase() {
  const c = trainFx.chase;
  c.yaw = 0;
  c.pitch = CHASE_DEFAULTS.pitch;
  c.distance = CHASE_DEFAULTS.distance;
  c.idle = 0;
}
