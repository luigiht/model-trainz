/** Train sets sold at the Depot. The set in service multiplies the train's top speed and fares. */
export type TrainSetId = "heritage" | "evergreen";

/** Display text (name, kind, flavor) lives in the i18n messages, keyed by id. */
export interface TrainSetDef {
  id: TrainSetId;
  price: number;
  /** Multipliers on top speed and station fares while this set is in service. */
  speed: number;
  fares: number;
  /** Livery colours for the shop swatch (CSS hex). */
  livery: [string, string, string];
}

export const TRAIN_SETS: TrainSetDef[] = [
  {
    id: "heritage",
    price: 0,
    speed: 1,
    fares: 1,
    livery: ["#2f7a4f", "#8a2f3a", "#f0e2bf"],
  },
  {
    id: "evergreen",
    price: 50_000,
    speed: 1.5,
    fares: 1.5,
    livery: ["#2f7a4f", "#d6a94a", "#f0e2bf"],
  },
];

export const DEFAULT_TRAIN_SET: TrainSetId = "heritage";

export const TRAIN_SET_BY_ID = Object.fromEntries(TRAIN_SETS.map((t) => [t.id, t])) as Record<
  TrainSetId,
  TrainSetDef
>;

export const isTrainSetId = (v: unknown): v is TrainSetId =>
  typeof v === "string" && v in TRAIN_SET_BY_ID;
