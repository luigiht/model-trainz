export type UpgradeId = "shovel" | "gang" | "boiler" | "fares" | "carriage" | "steel" | "golden";

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  /** Short effect description shown in the shop. */
  effect: string;
  flavor: string;
  baseCost: number;
  growth: number;
  maxLevel?: number;
}

export const UPGRADES: UpgradeDef[] = [
  {
    id: "shovel",
    name: "Bigger Shovels",
    effect: "+1 track piece per click",
    flavor: "Same arms. More enthusiasm.",
    baseCost: 10,
    growth: 1.55,
  },
  {
    id: "steel",
    name: "Steel Rails",
    effect: "+$1 per track piece laid",
    flavor: "Shinier, therefore pricier.",
    baseCost: 25,
    growth: 1.3,
  },
  {
    id: "gang",
    name: "Track Gang",
    effect: "+0.5 pieces/sec, automatically",
    flavor: "They whistle while they work. Loudly.",
    baseCost: 40,
    growth: 1.2,
  },
  {
    id: "boiler",
    name: "Hotter Boiler",
    effect: "+20% train speed",
    flavor: "Do not lick the boiler.",
    baseCost: 30,
    growth: 1.4,
    maxLevel: 20,
  },
  {
    id: "fares",
    name: "Fare Hike",
    effect: "+25% station fares",
    flavor: "Now with complimentary soot.",
    baseCost: 60,
    growth: 1.3,
  },
  {
    id: "carriage",
    name: "Extra Carriage",
    effect: "+1 carriage, +50% fares",
    flavor: "More seats, more tickets.",
    baseCost: 120,
    growth: 3.2,
    maxLevel: 5,
  },
  {
    id: "golden",
    name: "Golden Spikes",
    effect: "+2% chance a click pays 20×",
    flavor: "Shiny. Structurally questionable.",
    baseCost: 150,
    growth: 1.65,
    maxLevel: 15,
  },
];

export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u])) as Record<
  UpgradeId,
  UpgradeDef
>;
