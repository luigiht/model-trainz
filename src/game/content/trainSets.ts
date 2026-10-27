/** Train sets sold at the Depot. Cosmetic: every set runs and earns exactly like the others. */
export type TrainSetId = "heritage" | "express37";

/** Display text (name, kind, flavor) lives in the i18n messages, keyed by id. */
export interface TrainSetDef {
  id: TrainSetId;
  price: number;
  /** Livery colours for the shop swatch (CSS hex). */
  livery: [string, string, string];
}

export const TRAIN_SETS: TrainSetDef[] = [
  {
    id: "heritage",
    price: 0,
    livery: ["#2f7a4f", "#8a2f3a", "#f0e2bf"],
  },
  {
    id: "express37",
    price: 50_000,
    livery: ["#f2b51c", "#474d55", "#2aa3d8"],
  },
];

export const DEFAULT_TRAIN_SET: TrainSetId = "heritage";

/** The Depot is hidden for now: no shop tab, and the heritage set always runs. Saves keep their sets. */
export const DEPOT_ENABLED = false;

export const TRAIN_SET_BY_ID = Object.fromEntries(TRAIN_SETS.map((t) => [t.id, t])) as Record<
  TrainSetId,
  TrainSetDef
>;

export const isTrainSetId = (v: unknown): v is TrainSetId =>
  typeof v === "string" && v in TRAIN_SET_BY_ID;
