export type UpgradeId =
  "shovel" | "gang" | "boiler" | "fares" | "carriage" | "platform" | "steel" | "golden";

/** Display text (name, effect, flavor) lives in the i18n messages, keyed by id. */
export interface UpgradeDef {
  id: UpgradeId;
  baseCost: number;
  growth: number;
  maxLevel?: number;
}

/** Longer Platforms: each level adds a platform section of PLATFORM_SECTION world units. */
export const PLATFORM_MAX_LEVEL = 5;
export const PLATFORM_SECTION = 3;

export const UPGRADES: UpgradeDef[] = [
  { id: "shovel", baseCost: 10, growth: 1.55 },
  { id: "steel", baseCost: 25, growth: 1.3 },
  { id: "gang", baseCost: 40, growth: 1.2 },
  { id: "boiler", baseCost: 30, growth: 1.4, maxLevel: 20 },
  { id: "fares", baseCost: 60, growth: 1.3 },
  { id: "carriage", baseCost: 120, growth: 3.2, maxLevel: 5 },
  { id: "platform", baseCost: 90, growth: 2.4, maxLevel: PLATFORM_MAX_LEVEL },
  { id: "golden", baseCost: 150, growth: 1.65, maxLevel: 15 },
];

export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u])) as Record<
  UpgradeId,
  UpgradeDef
>;
