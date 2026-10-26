import { Vector3, type Object3D } from "three";

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
  /** Cab-view look offset from straight ahead (radians), driven by drag / arrow keys. */
  cabLook: { yaw: 0, pitch: 0 },
  /** 0 = diorama camera, 1 = cab camera (blended during transitions). */
  cabBlend: 0,
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
