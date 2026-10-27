import { describe, expect, it } from "vitest";
import { createInitialState } from "@/game/simulation/GameState";
import { buyTrainSet, selectTrainSet } from "@/game/simulation/step";
import { deserializeSave, serializeSave } from "@/game/save/save";
import { DEFAULT_TRAIN_SET, TRAIN_SETS, TRAIN_SET_BY_ID } from "@/game/content/trainSets";

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
    const price = TRAIN_SET_BY_ID.express37.price;
    st.coins = price - 1;
    expect(buyTrainSet(st, "express37")).toBe(false);
    expect(st.ownedSets).not.toContain("express37");
    st.coins = price + 5;
    expect(buyTrainSet(st, "express37")).toBe(true);
    expect(st.coins).toBe(5);
    expect(st.trainSet).toBe("express37");
    expect(buyTrainSet(st, "express37")).toBe(false); // can't buy twice
  });

  it("switching is free and only allowed for owned sets", () => {
    const st = createInitialState();
    expect(selectTrainSet(st, "express37")).toBe(false);
    st.coins = TRAIN_SET_BY_ID.express37.price;
    buyTrainSet(st, "express37");
    expect(selectTrainSet(st, "heritage")).toBe(true);
    expect(st.trainSet).toBe("heritage");
    expect(st.coins).toBe(0);
    expect(selectTrainSet(st, "express37")).toBe(true);
  });

  it("prices rise through the catalogue", () => {
    for (let i = 1; i < TRAIN_SETS.length; i++)
      expect(TRAIN_SETS[i].price).toBeGreaterThan(TRAIN_SETS[i - 1].price);
  });

  it("old saves get the default set; unknown or unowned sets are dropped", () => {
    const old = createInitialState() as unknown as Record<string, unknown>;
    delete old.trainSet;
    delete old.ownedSets;
    const a = deserializeSave(envelopeFor(old));
    expect(a.ok && a.state.trainSet).toBe(DEFAULT_TRAIN_SET);
    expect(a.ok && a.state.ownedSets).toEqual([DEFAULT_TRAIN_SET]);

    // Retired sets (e.g. "alpine") and unknown ids are dropped; an unowned set falls back.
    const bad = { ...old, trainSet: "express37", ownedSets: ["alpine", "monorail"] };
    const b = deserializeSave(envelopeFor(bad));
    expect(b.ok && b.state.ownedSets).toEqual([DEFAULT_TRAIN_SET]);
    expect(b.ok && b.state.trainSet).toBe(DEFAULT_TRAIN_SET);
  });
});
