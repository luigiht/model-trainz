import { Vector3 } from "three";

/** Mutable effect state shared between the train, steam and camera (never React state). */
export const trainFx = {
  /** World position of the chimney top, updated every frame by <Train/>. */
  chimney: new Vector3(),
  /** Decaying impulse added on each click (body jolt / camera nudge). */
  jolt: 0,
  /** Puffs requested by events, consumed by <Steam/>. */
  pendingPuffs: 0,
};
