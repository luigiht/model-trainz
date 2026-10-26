/** Pure economy formulas. */
import { UPGRADE_BY_ID, UPGRADES, type UpgradeId } from "@/game/content/upgrades";

export type UpgradeLevels = Record<UpgradeId, number>;

export const emptyLevels = (): UpgradeLevels =>
  Object.fromEntries(UPGRADES.map((u) => [u.id, 0])) as UpgradeLevels;

/** cost(n) = baseCost * growth^n for the (n+1)-th level. */
export function upgradeCost(id: UpgradeId, level: number): number {
  const u = UPGRADE_BY_ID[id];
  return Math.ceil(u.baseCost * u.growth ** level);
}

/** Total cost of buying `count` levels starting at `level`. */
export function bulkCost(id: UpgradeId, level: number, count: number): number {
  let total = 0;
  for (let i = 0; i < count; i++) total += upgradeCost(id, level + i);
  return total;
}

export function isMaxed(id: UpgradeId, level: number): boolean {
  const max = UPGRADE_BY_ID[id].maxLevel;
  return max !== undefined && level >= max;
}

export interface DerivedStats {
  piecesPerClick: number;
  autoLayPerSec: number;
  coinsPerPiece: number;
  maxSpeed: number;
  fareMultiplier: number;
  carriages: number;
  goldenChance: number;
}

export const BASE_SPEED = 6; // world units per second
export const GOLDEN_MULTIPLIER = 20;

export function deriveStats(l: UpgradeLevels): DerivedStats {
  return {
    piecesPerClick: 1 + l.shovel,
    autoLayPerSec: 0.5 * l.gang,
    coinsPerPiece: 1 + l.steel,
    maxSpeed: BASE_SPEED * (1 + 0.2 * l.boiler),
    fareMultiplier: (1 + 0.25 * l.fares) * (1 + 0.5 * l.carriage),
    carriages: 1 + l.carriage,
    goldenChance: 0.02 * l.golden,
  };
}
