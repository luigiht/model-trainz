import { emptyLevels, type UpgradeLevels } from "@/game/economy/economy";
import { DEFAULT_TRAIN_SET, type TrainSetId } from "@/game/content/trainSets";
import { DWELL_SECONDS, INITIAL_PIECES, START_S } from "./rules";

export type TrainPhase = "docked" | "traveling";

export interface GameStats {
  clicks: number;
  piecesLaid: number;
  stationsVisited: number;
  distance: number;
  goldenSpikes: number;
}

/** The complete, serialisable game state. Plain data only. */
export interface GameState {
  seed: number;
  coins: number;
  lifetimeCoins: number;
  /** Track pieces laid (including the starting stub). */
  laid: number;
  /** Fractional auto-laid pieces carried between ticks. */
  autoLayCarry: number;
  /** Arc length of the locomotive's front. */
  trainS: number;
  trainV: number;
  /** Station the train is docked at (or departed from while traveling). */
  station: number;
  phase: TrainPhase;
  dwell: number;
  levels: UpgradeLevels;
  stats: GameStats;
  /** Train set in service, and every set bought at the Depot. */
  trainSet: TrainSetId;
  ownedSets: TrainSetId[];
}

export function createInitialState(seed = 20261026): GameState {
  return {
    seed,
    coins: 0,
    lifetimeCoins: 0,
    laid: INITIAL_PIECES,
    autoLayCarry: 0,
    trainS: START_S,
    trainV: 0,
    station: 0,
    phase: "docked",
    dwell: DWELL_SECONDS,
    levels: emptyLevels(),
    stats: { clicks: 0, piecesLaid: 0, stationsVisited: 0, distance: 0, goldenSpikes: 0 },
    trainSet: DEFAULT_TRAIN_SET,
    ownedSets: [DEFAULT_TRAIN_SET],
  };
}
