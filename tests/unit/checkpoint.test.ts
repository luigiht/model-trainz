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
