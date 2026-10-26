/**
 * Runtime owner of the simulation. The GameState lives here as a mutable object (read imperatively
 * by the renderer every frame); React only sees the throttled `useHud` snapshot.
 */
import { create } from "zustand";
import type { UpgradeId } from "@/game/content/upgrades";
import { deriveStats, type DerivedStats, type UpgradeLevels } from "@/game/economy/economy";
import { readSave, writeSave, clearSave } from "@/game/save/save";
import { createInitialState, type TrainPhase } from "@/game/simulation/GameState";
import { Route } from "@/game/simulation/route";
import { PIECE_LENGTH, railheadS, stationS } from "@/game/simulation/rules";
import {
  buyUpgrade,
  clickLayTrack,
  simulateAway,
  stepSim,
  type GameEvent,
} from "@/game/simulation/step";

export const SIM_HZ = 30;
const SIM_DT = 1 / SIM_HZ;
const MAX_CPS = 12;
const OFFLINE_CAP_SECONDS = 8 * 3600;
/** Gaps longer than this (tab hidden, laptop asleep) go through the coarse catch-up. */
const CATCH_UP_THRESHOLD = 2;
const AUTOSAVE_MS = 10_000;
/** Only greet the player with a summary after a real break. */
const WELCOME_BACK_MIN_SECONDS = 60;

export const game = {
  state: createInitialState(),
  route: new Route(createInitialState().seed),
  /** Recently laid piece ranges, for the drop-in animation: [firstIndex, lastIndexExclusive, time]. */
  recentLays: [] as { from: number; to: number; at: number }[],
};

type Listener = (e: GameEvent) => void;
const listeners = new Set<Listener>();
export function onGameEvent(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export interface HudSnapshot {
  coins: number;
  laid: number;
  station: number;
  phase: TrainPhase;
  /** Pieces still needed to reach the next station (0 when complete). */
  piecesToNext: number;
  legProgress: number;
  levels: UpgradeLevels;
  stats: DerivedStats;
  clicks: number;
  distance: number;
}

function snapshot(): HudSnapshot {
  const s = game.state;
  const from = stationS(s.station);
  const to = stationS(s.station + 1);
  const head = railheadS(s.laid);
  return {
    coins: s.coins,
    laid: s.laid,
    station: s.station,
    phase: s.phase,
    piecesToNext: Math.max(0, Math.ceil((to - head) / PIECE_LENGTH)),
    legProgress: Math.min(1, Math.max(0, (head - from) / (to - from))),
    levels: { ...s.levels },
    stats: deriveStats(s.levels),
    clicks: s.stats.clicks,
    distance: s.stats.distance,
  };
}

export const useHud = create<HudSnapshot>()(() => snapshot());

export interface AwaySummary {
  seconds: number;
  coins: number;
  pieces: number;
  stations: number;
}

export const useAway = create<{ summary: AwaySummary | null; dismiss: () => void }>()((set) => ({
  summary: null,
  dismiss: () => set({ summary: null }),
}));

const events: GameEvent[] = [];
function flush() {
  for (const e of events) {
    if (e.type === "laid") {
      game.recentLays.push({
        from: game.state.laid - e.pieces,
        to: game.state.laid,
        at: performance.now(),
      });
      if (game.recentLays.length > 32) game.recentLays.shift();
    }
    for (const l of listeners) l(e);
  }
  events.length = 0;
}

let accumulator = 0;
let lastHud = 0;
let lastSave = 0;

/** Called every rendered frame with the real elapsed time. */
export function tickGame(dt: number) {
  if (dt > CATCH_UP_THRESHOLD) {
    catchUp(dt, false);
    return;
  }
  accumulator += dt;
  while (accumulator >= SIM_DT) {
    stepSim(game.state, SIM_DT, events);
    accumulator -= SIM_DT;
  }
  flush();
  const now = performance.now();
  if (now - lastHud > 100) {
    lastHud = now;
    useHud.setState(snapshot());
  }
  if (now - lastSave > AUTOSAVE_MS) {
    lastSave = now;
    writeSave(game.state);
  }
}

function catchUp(seconds: number, showDialog: boolean) {
  const capped = Math.min(seconds, OFFLINE_CAP_SECONDS);
  const res = simulateAway(game.state, capped);
  useHud.setState(snapshot());
  if (showDialog && capped >= WELCOME_BACK_MIN_SECONDS && (res.coins > 0 || res.pieces > 0))
    useAway.setState({ summary: { seconds: capped, ...res } });
}

const clickTimes: number[] = [];
/** Player click: rate-limited to MAX_CPS. Returns the coins earned (0 if throttled). */
export function playerLayTrack(): { coins: number; golden: boolean } | null {
  const now = performance.now();
  while (clickTimes.length && now - clickTimes[0] > 1000) clickTimes.shift();
  if (clickTimes.length >= MAX_CPS) return null;
  clickTimes.push(now);
  const before = game.state.coins;
  clickLayTrack(game.state, events);
  const golden = events.some((e) => e.type === "laid" && e.golden);
  flush();
  useHud.setState(snapshot());
  return { coins: game.state.coins - before, golden };
}

export function playerBuy(id: UpgradeId): boolean {
  const ok = buyUpgrade(game.state, id);
  if (ok) {
    useHud.setState(snapshot());
    writeSave(game.state);
  }
  return ok;
}

let initialised = false;
/** Load the save (once) and apply offline progress. */
export function initGame() {
  if (initialised) return;
  initialised = true;
  const res = readSave();
  if (res?.ok) {
    game.state = res.state;
    game.route = new Route(res.state.seed);
    catchUp((Date.now() - res.savedAt) / 1000, true);
  }
  useHud.setState(snapshot());
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") writeSave(game.state);
  });
  window.addEventListener("pagehide", () => writeSave(game.state));
}

export function resetGame() {
  clearSave();
  game.state = createInitialState();
  game.route = new Route(game.state.seed);
  game.recentLays = [];
  useHud.setState(snapshot());
}
