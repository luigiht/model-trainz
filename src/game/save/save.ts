/**
 * Versioned save format with checksum and a backup slot. Serialisation is pure (testable); the
 * localStorage helpers swallow quota / privacy-mode errors and report them instead of throwing.
 */
import { seedFromString } from "@/lib/rng";
import { emptyLevels } from "@/game/economy/economy";
import { DEFAULT_TRAIN_SET, isTrainSetId } from "@/game/content/trainSets";
import { createInitialState, type GameState } from "@/game/simulation/GameState";

export const SAVE_VERSION = 1;
/** The single slot used before Game IDs; a first visit still starts from it. */
export const SAVE_KEY = "rbc-save";
export const BACKUP_KEY = "rbc-save-backup";

let slotKey = SAVE_KEY;
let backupKey = BACKUP_KEY;

/** Points local saves at one game's own slot. */
export function setSaveSlot(gameId: string) {
  slotKey = `mt-save:${gameId}`;
  backupKey = `mt-save-backup:${gameId}`;
}

interface SaveEnvelope {
  v: number;
  savedAt: number;
  checksum: number;
  state: GameState;
}

const checksum = (json: string) => seedFromString(json);

export function serializeSave(state: GameState, savedAt = Date.now()): string {
  const json = JSON.stringify(state);
  const env: SaveEnvelope = { v: SAVE_VERSION, savedAt, checksum: checksum(json), state };
  return JSON.stringify(env);
}

export type LoadResult =
  { ok: true; state: GameState; savedAt: number } | { ok: false; reason: string };

/** Migrations from older versions run in order; v1 is the first format. */
const MIGRATIONS: Record<number, (s: Record<string, unknown>) => Record<string, unknown>> = {};

export function deserializeSave(raw: string): LoadResult {
  let env: SaveEnvelope;
  try {
    env = JSON.parse(raw) as SaveEnvelope;
  } catch {
    return { ok: false, reason: "Save data is not valid JSON." };
  }
  if (typeof env?.v !== "number" || typeof env.state !== "object" || env.state === null) {
    return { ok: false, reason: "Save data is missing required fields." };
  }
  if (env.v > SAVE_VERSION)
    return { ok: false, reason: "Save is from a newer version of the game." };
  if (checksum(JSON.stringify(env.state)) !== env.checksum)
    return { ok: false, reason: "Save data is corrupted." };

  let s = env.state as unknown as Record<string, unknown>;
  for (let v = env.v; v < SAVE_VERSION; v++) s = MIGRATIONS[v]?.(s) ?? s;

  // Fill any fields added since (defensive merge onto a fresh state).
  const fresh = createInitialState();
  const merged = { ...fresh, ...s } as GameState;
  merged.levels = { ...emptyLevels(), ...(s.levels as object) };
  merged.stats = { ...fresh.stats, ...(s.stats as object) };
  const owned = Array.isArray(s.ownedSets) ? s.ownedSets.filter(isTrainSetId) : [];
  merged.ownedSets = [...new Set([DEFAULT_TRAIN_SET, ...owned])];
  merged.trainSet =
    isTrainSetId(s.trainSet) && merged.ownedSets.includes(s.trainSet)
      ? s.trainSet
      : DEFAULT_TRAIN_SET;
  return { ok: true, state: merged, savedAt: env.savedAt };
}

export function writeSave(state: GameState): string | null {
  try {
    const prev = localStorage.getItem(slotKey);
    if (prev) localStorage.setItem(backupKey, prev);
    localStorage.setItem(slotKey, serializeSave(state));
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Could not write save.";
  }
}

export function readSave(): LoadResult | null {
  try {
    const raw = localStorage.getItem(slotKey);
    if (!raw) return null;
    const res = deserializeSave(raw);
    if (res.ok) return res;
    const backup = localStorage.getItem(backupKey);
    return backup ? deserializeSave(backup) : res;
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(slotKey);
    localStorage.removeItem(backupKey);
  } catch {
    /* storage unavailable: nothing to clear */
  }
}
