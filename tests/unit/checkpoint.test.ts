import { afterEach, describe, expect, it, vi } from "vitest";
import {
  game,
  loadGame,
  onCheckpoint,
  playerBuy,
  playerDepot,
  setRunning,
  tickGame,
} from "@/game/state/game";
import { TRAIN_SET_BY_ID } from "@/game/content/trainSets";
import { railheadS, stationS } from "@/game/simulation/rules";

describe("checkpoints (pushed to the server right away)", () => {
  let off = () => {};
  afterEach(() => {
    off();
    setRunning(false);
  });

  it("fire when an upgrade or a train set is bought, not on a failed purchase", () => {
    loadGame(null);
    const fn = vi.fn();
    off = onCheckpoint(fn);
    expect(playerBuy("shovel")).toBe(false);
    expect(fn).not.toHaveBeenCalled();
    game.state.coins = TRAIN_SET_BY_ID.evergreen.price + 1000;
    expect(playerBuy("shovel")).toBe(true);
    expect(playerDepot("evergreen")).toBe(true);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("fire when the train reaches a stop", () => {
    loadGame(null);
    const fn = vi.fn();
    off = onCheckpoint(fn);
    const s = game.state;
    while (railheadS(s.laid) < stationS(1)) s.laid++;
    s.phase = "traveling";
    s.trainS = stationS(1) - 0.05;
    s.trainV = 1;
    setRunning(true);
    tickGame(0.2);
    expect(s.station).toBe(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("rendered train position", () => {
  afterEach(() => setRunning(false));

  it("advances smoothly every frame between fixed simulation steps", () => {
    loadGame(null);
    const s = game.state;
    while (railheadS(s.laid) < stationS(1)) s.laid++;
    s.phase = "traveling";
    s.trainV = 6;
    setRunning(true);
    tickGame(0.5);
    // 144 Hz frames against the 30 Hz simulation: the drawn train never stalls or jumps back.
    let last = game.view.trainS;
    const deltas: number[] = [];
    for (let i = 0; i < 60; i++) {
      tickGame(1 / 144);
      deltas.push(game.view.trainS - last);
      last = game.view.trainS;
    }
    expect(Math.min(...deltas)).toBeGreaterThan(0);
    expect(Math.max(...deltas) / Math.min(...deltas)).toBeLessThan(1.6);
    expect(game.view.trainS).toBeLessThanOrEqual(s.trainS);
  });
});
