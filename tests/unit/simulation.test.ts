import { describe, expect, it } from "vitest";
import { createInitialState } from "@/game/simulation/GameState";
import {
  buyUpgrade,
  clickLayTrack,
  simulateAway,
  stepSim,
  type GameEvent,
} from "@/game/simulation/step";
import {
  DWELL_SECONDS,
  INITIAL_PIECES,
  legPieces,
  railheadS,
  stationS,
  START_S,
  PIECE_LENGTH,
} from "@/game/simulation/rules";
import { bulkCost, deriveStats, upgradeCost, isMaxed, emptyLevels } from "@/game/economy/economy";
import { UPGRADES } from "@/game/content/upgrades";

const never = () => 1; // rand() that never rolls a golden spike

function run(
  state: ReturnType<typeof createInitialState>,
  seconds: number,
  events: GameEvent[] = [],
) {
  for (let t = 0; t < seconds; t += 1 / 30) stepSim(state, 1 / 30, events);
  return events;
}

describe("rules", () => {
  it("station positions match the sum of leg lengths", () => {
    let s = START_S;
    for (let k = 0; k < 30; k++) {
      expect(stationS(k)).toBe(s);
      s += legPieces(k) * PIECE_LENGTH;
    }
  });
  it("the train starts docked at station 0 on laid track", () => {
    const st = createInitialState();
    expect(st.trainS).toBe(stationS(0));
    expect(railheadS(INITIAL_PIECES)).toBeGreaterThanOrEqual(st.trainS);
  });
});

describe("clicking lays track", () => {
  it("each click lays piecesPerClick pieces and pays per piece", () => {
    const st = createInitialState();
    const ev: GameEvent[] = [];
    clickLayTrack(st, ev, never);
    expect(st.laid).toBe(INITIAL_PIECES + 1);
    expect(st.coins).toBe(1);
    expect(ev[0]).toMatchObject({ type: "laid", pieces: 1, manual: true });
    st.levels.shovel = 2;
    st.levels.steel = 1;
    clickLayTrack(st, ev, never);
    expect(st.laid).toBe(INITIAL_PIECES + 4);
    expect(st.coins).toBe(1 + 3 * 2);
  });

  it("golden spikes multiply the click payout", () => {
    const st = createInitialState();
    st.levels.golden = 1;
    clickLayTrack(st, [], () => 0);
    expect(st.coins).toBe(20);
    expect(st.stats.goldenSpikes).toBe(1);
  });
});

describe("train journey", () => {
  it("waits at the station until the leg is complete, then departs and arrives with a fare", () => {
    const st = createInitialState();
    expect(run(st, 3).some((e) => e.type === "depart")).toBe(false);
    const needed = Math.ceil((stationS(1) - railheadS(st.laid)) / PIECE_LENGTH);
    for (let i = 0; i < needed; i++) clickLayTrack(st, [], never);

    const events = run(st, 60);
    const depart = events.findIndex((e) => e.type === "depart");
    const arrive = events.find((e) => e.type === "arrive");
    expect(depart).toBeGreaterThanOrEqual(0);
    expect(arrive).toMatchObject({ type: "arrive", station: 1 });
    expect(st.station).toBe(1);
    expect(st.phase).toBe("docked");
    expect(st.trainS).toBe(stationS(1));
    expect(st.coins).toBeGreaterThan(needed);
  });

  it("never runs past the railhead and respects the dwell time", () => {
    const st = createInitialState();
    st.levels.boiler = 20;
    st.levels.gang = 30; // 15 pieces/sec
    for (let t = 0; t < 120; t += 1 / 30) {
      const before = st.phase;
      stepSim(st, 1 / 30, []);
      expect(st.trainS).toBeLessThanOrEqual(railheadS(st.laid) + 1e-9);
      if (before === "docked" && st.phase === "traveling") expect(st.dwell).toBe(0);
    }
    expect(st.station).toBeGreaterThan(2);
    expect(DWELL_SECONDS).toBeGreaterThan(0);
  });

  it("the track gang lays pieces over time", () => {
    const st = createInitialState();
    st.levels.gang = 2; // 1 piece / s
    run(st, 10);
    expect(st.laid - INITIAL_PIECES).toBeGreaterThanOrEqual(9);
  });

  it("simulateAway is roughly equivalent to fine stepping", () => {
    const a = createInitialState();
    const b = createInitialState();
    a.levels.gang = b.levels.gang = 4;
    run(a, 300);
    simulateAway(b, 300);
    expect(Math.abs(a.laid - b.laid)).toBeLessThanOrEqual(1);
    expect(Math.abs(a.station - b.station)).toBeLessThanOrEqual(1);
  });
});

describe("economy", () => {
  it("costs grow geometrically", () => {
    for (const u of UPGRADES) {
      expect(upgradeCost(u.id, 0)).toBe(Math.ceil(u.baseCost));
      expect(upgradeCost(u.id, 5)).toBeGreaterThan(upgradeCost(u.id, 4));
      expect(bulkCost(u.id, 0, 3)).toBe(
        upgradeCost(u.id, 0) + upgradeCost(u.id, 1) + upgradeCost(u.id, 2),
      );
    }
  });

  it("the first upgrade is affordable within ~10 clicks", () => {
    expect(Math.min(...UPGRADES.map((u) => upgradeCost(u.id, 0)))).toBeLessThanOrEqual(10);
  });

  it("buying spends coins, levels up, and respects max level", () => {
    const st = createInitialState();
    expect(buyUpgrade(st, "shovel")).toBe(false);
    st.coins = 1e9;
    expect(buyUpgrade(st, "shovel")).toBe(true);
    expect(st.levels.shovel).toBe(1);
    expect(st.coins).toBe(1e9 - upgradeCost("shovel", 0));
    st.levels.carriage = 5;
    expect(isMaxed("carriage", 5)).toBe(true);
    expect(buyUpgrade(st, "carriage")).toBe(false);
  });

  it("derived stats reflect levels", () => {
    const l = emptyLevels();
    expect(deriveStats(l, "heritage")).toMatchObject({
      piecesPerClick: 1,
      autoLayPerSec: 0,
      carriages: 1,
    });
    l.carriage = 2;
    l.fares = 4;
    expect(deriveStats(l, "heritage").fareMultiplier).toBeCloseTo(2 * 2);
  });
});
