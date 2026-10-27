/** The simulation: pure functions that mutate a GameState and report events. */
import { GOLDEN_MULTIPLIER, deriveStats, upgradeCost, isMaxed } from "@/game/economy/economy";
import type { UpgradeId } from "@/game/content/upgrades";
import { TRAIN_SET_BY_ID, type TrainSetId } from "@/game/content/trainSets";
import type { GameState } from "./GameState";
import { DWELL_SECONDS, TRAIN_ACCEL, legFare, railheadS, stationS } from "./rules";

export type GameEvent =
  | { type: "laid"; pieces: number; coins: number; golden: boolean; manual: boolean }
  | { type: "depart"; station: number }
  | { type: "arrive"; station: number; fare: number };

function earn(state: GameState, amount: number) {
  state.coins += amount;
  state.lifetimeCoins += amount;
}

function lay(
  state: GameState,
  pieces: number,
  coinsEach: number,
  golden: boolean,
  manual: boolean,
  events: GameEvent[],
) {
  if (pieces <= 0) return;
  const coins = pieces * coinsEach * (golden ? GOLDEN_MULTIPLIER : 1);
  state.laid += pieces;
  state.stats.piecesLaid += pieces;
  earn(state, coins);
  events.push({ type: "laid", pieces, coins, golden, manual });
}

/** A player click: lays `piecesPerClick` pieces, with a chance of a golden payout. */
export function clickLayTrack(
  state: GameState,
  events: GameEvent[],
  rand: () => number = Math.random,
) {
  const stats = deriveStats(state.levels);
  const golden = rand() < stats.goldenChance;
  state.stats.clicks++;
  if (golden) state.stats.goldenSpikes++;
  lay(state, stats.piecesPerClick, stats.coinsPerPiece, golden, true, events);
}

export function canBuy(state: GameState, id: UpgradeId): boolean {
  const level = state.levels[id];
  return !isMaxed(id, level) && state.coins >= upgradeCost(id, level);
}

export function buyUpgrade(state: GameState, id: UpgradeId): boolean {
  if (!canBuy(state, id)) return false;
  state.coins -= upgradeCost(id, state.levels[id]);
  state.levels[id]++;
  return true;
}

/** Depot purchase: pays the set's price and puts it into service. */
export function buyTrainSet(state: GameState, id: TrainSetId): boolean {
  const set = TRAIN_SET_BY_ID[id];
  if (!set || state.ownedSets.includes(id) || state.coins < set.price) return false;
  state.coins -= set.price;
  state.ownedSets.push(id);
  state.trainSet = id;
  return true;
}

/** Swap to a set that's already been bought. */
export function selectTrainSet(state: GameState, id: TrainSetId): boolean {
  if (!state.ownedSets.includes(id) || state.trainSet === id) return false;
  state.trainSet = id;
  return true;
}

/** Advance the world by dt seconds. */
export function stepSim(state: GameState, dt: number, events: GameEvent[]) {
  const stats = deriveStats(state.levels);

  // Automatic track gang.
  state.autoLayCarry += stats.autoLayPerSec * dt;
  const auto = Math.floor(state.autoLayCarry);
  if (auto > 0) {
    state.autoLayCarry -= auto;
    lay(state, auto, stats.coinsPerPiece, false, false, events);
  }

  const next = stationS(state.station + 1);
  if (state.phase === "docked") {
    state.dwell = Math.max(0, state.dwell - dt);
    if (state.dwell === 0 && railheadS(state.laid) >= next) {
      state.phase = "traveling";
      events.push({ type: "depart", station: state.station });
    }
    return;
  }

  // Traveling: accelerate, then brake to stop exactly at the next platform.
  const remaining = next - state.trainS;
  const target = Math.min(
    stats.maxSpeed,
    Math.sqrt(2 * TRAIN_ACCEL * Math.max(0, remaining)) + 0.3,
  );
  state.trainV =
    state.trainV < target
      ? Math.min(target, state.trainV + TRAIN_ACCEL * dt)
      : Math.max(target, state.trainV - TRAIN_ACCEL * 2 * dt);
  const move = Math.min(remaining, state.trainV * dt);
  state.trainS += move;
  state.stats.distance += move;

  if (next - state.trainS <= 1e-6) {
    state.trainS = next;
    state.trainV = 0;
    const fare = Math.round(legFare(state.station) * stats.fareMultiplier);
    state.station++;
    state.phase = "docked";
    state.dwell = DWELL_SECONDS;
    state.stats.stationsVisited++;
    earn(state, fare);
    events.push({ type: "arrive", station: state.station, fare });
  }
}

/**
 * Coarse catch-up for time away (tab hidden / offline). Uses 1 s steps; capped by the caller.
 * Only the track gang works while you're away.
 */
export function simulateAway(
  state: GameState,
  seconds: number,
): { coins: number; pieces: number; stations: number } {
  const before = { coins: state.lifetimeCoins, pieces: state.laid, stations: state.station };
  const sink: GameEvent[] = [];
  let t = seconds;
  while (t > 0) {
    const dt = Math.min(1, t);
    stepSim(state, dt, sink);
    sink.length = 0;
    t -= dt;
  }
  return {
    coins: state.lifetimeCoins - before.coins,
    pieces: state.laid - before.pieces,
    stations: state.station - before.stations,
  };
}
