import { describe, expect, it } from "vitest";
import { createInitialState } from "@/game/simulation/GameState";
import { buyTrainSet, selectTrainSet } from "@/game/simulation/step";
import { deserializeSave, serializeSave } from "@/game/save/save";
import { DEFAULT_TRAIN_SET, TRAIN_SETS, TRAIN_SET_BY_ID } from "@/game/content/trainSets";
import { deriveStats } from "@/game/economy/economy";

const envelopeFor = (state: Record<string, unknown>) => {
  const env = JSON.parse(serializeSave(createInitialState()));
  env.state = state;
  env.checksum = JSON.parse(serializeSave(state as never)).checksum;
  return JSON.stringify(env);
};

describe("depot", () => {
  it("starts with only the heritage set, in service", () => {
    const st = createInitialState();
    expect(st.trainSet).toBe(DEFAULT_TRAIN_SET);
    expect(st.ownedSets).toEqual([DEFAULT_TRAIN_SET]);
    expect(TRAIN_SET_BY_ID[DEFAULT_TRAIN_SET].price).toBe(0);
  });

  it("buying needs the full price, deducts it and puts the set into service", () => {
    const st = createInitialState();
    const price = TRAIN_SET_BY_ID.evergreen.price;
    st.coins = price - 1;
    expect(buyTrainSet(st, "evergreen")).toBe(false);
    expect(st.ownedSets).not.toContain("evergreen");
    st.coins = price + 5;
    expect(buyTrainSet(st, "evergreen")).toBe(true);
    expect(st.coins).toBe(5);
    expect(st.trainSet).toBe("evergreen");
    expect(buyTrainSet(st, "evergreen")).toBe(false); // can't buy twice
  });

  it("switching is free and only allowed for owned sets", () => {
    const st = createInitialState();
    expect(selectTrainSet(st, "evergreen")).toBe(false);
    st.coins = TRAIN_SET_BY_ID.evergreen.price;
    buyTrainSet(st, "evergreen");
    expect(selectTrainSet(st, "heritage")).toBe(true);
    expect(st.trainSet).toBe("heritage");
    expect(st.coins).toBe(0);
    expect(selectTrainSet(st, "evergreen")).toBe(true);
  });

  it("prices rise through the catalogue", () => {
    for (let i = 1; i < TRAIN_SETS.length; i++)
      expect(TRAIN_SETS[i].price).toBeGreaterThan(TRAIN_SETS[i - 1].price);
  });

  it("the Evergreen Express is faster and earns more, only while in service", () => {
    const st = createInitialState();
    const steam = deriveStats(st.levels, st.trainSet);
    st.coins = TRAIN_SET_BY_ID.evergreen.price;
    buyTrainSet(st, "evergreen");
    const diesel = deriveStats(st.levels, st.trainSet);
    expect(diesel.maxSpeed).toBeCloseTo(steam.maxSpeed * 1.5);
    expect(diesel.fareMultiplier).toBeCloseTo(steam.fareMultiplier * 1.5);
    expect(diesel.piecesPerClick).toBe(steam.piecesPerClick);
    selectTrainSet(st, "heritage");
    expect(deriveStats(st.levels, st.trainSet)).toEqual(steam);
  });

  it("old saves get the default set; unknown or unowned sets are dropped", () => {
    const old = createInitialState() as unknown as Record<string, unknown>;
    delete old.trainSet;
    delete old.ownedSets;
    const a = deserializeSave(envelopeFor(old));
    expect(a.ok && a.state.trainSet).toBe(DEFAULT_TRAIN_SET);
    expect(a.ok && a.state.ownedSets).toEqual([DEFAULT_TRAIN_SET]);

    // Retired sets (e.g. "express37") and unknown ids are dropped; an unowned set falls back.
    const bad = { ...old, trainSet: "evergreen", ownedSets: ["express37", "monorail"] };
    const b = deserializeSave(envelopeFor(bad));
    expect(b.ok && b.state.ownedSets).toEqual([DEFAULT_TRAIN_SET]);
    expect(b.ok && b.state.trainSet).toBe(DEFAULT_TRAIN_SET);

    // A save running a retired set goes back to the default one.
    const retired = { ...old, trainSet: "express37", ownedSets: ["heritage", "express37"] };
    const c = deserializeSave(envelopeFor(retired));
    expect(c.ok && c.state.ownedSets).toEqual([DEFAULT_TRAIN_SET]);
    expect(c.ok && c.state.trainSet).toBe(DEFAULT_TRAIN_SET);
  });
});
