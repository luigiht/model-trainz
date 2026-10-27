/** Train sets sold at the Depot. Cosmetic: every set runs and earns exactly like the others. */
export type TrainSetId = "heritage" | "express37";

export interface TrainSetDef {
  id: TrainSetId;
  name: string;
  kind: string;
  flavor: string;
  price: number;
  /** Livery colours for the shop swatch (CSS hex). */
  livery: [string, string, string];
}

export const TRAIN_SETS: TrainSetDef[] = [
  {
    id: "heritage",
    name: "Heritage Steam",
    kind: "Steam tank engine + teak coaches",
    flavor: "Where it all began.",
    price: 0,
    livery: ["#2f7a4f", "#8a2f3a", "#f0e2bf"],
  },
  {
    id: "express37",
    name: "Highland Express",
    kind: "Type 3 diesel + express coaches",
    flavor: "Thrashes like a tractor, cruises like a dream.",
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
