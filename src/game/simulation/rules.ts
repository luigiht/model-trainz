/** Track-layout rules: piece length, leg lengths between stations, station positions, fares. */

export const PIECE_LENGTH = 2;
/** Arc length of station 0 (the train's front sits here at the start; room behind for 6 carriages). */
export const START_S = 40;
/** Pieces already laid at the start: the siding behind the train plus a short stub ahead. */
export const INITIAL_PIECES = 22;
export const MAX_LEG_PIECES = 40;
export const TRAIN_ACCEL = 3;
/** Seconds the train waits at a platform before it may depart. */
export const DWELL_SECONDS = 1.2;

/** Pieces of track between station k and station k+1. */
export function legPieces(k: number): number {
  return Math.min(MAX_LEG_PIECES, 10 + 3 * k);
}

/** Arc length of station k along the route. */
export function stationS(k: number): number {
  // Closed form of START_S + PIECE_LENGTH * Σ_{j<k} legPieces(j).
  const ramp = Math.min(k, 10); // legs 0..9 ramp 10, 13, … 37; then capped at 40
  const rampSum = 10 * ramp + (3 * ramp * (ramp - 1)) / 2;
  return START_S + PIECE_LENGTH * (rampSum + Math.max(0, k - 10) * MAX_LEG_PIECES);
}

/** Base fare paid on arriving at station k+1 (before multipliers). */
export function legFare(k: number): number {
  return Math.round(legPieces(k) * 3 * (1 + k * 0.15));
}

export const railheadS = (laid: number) => laid * PIECE_LENGTH;
