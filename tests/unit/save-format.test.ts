import { describe, expect, it } from "vitest";
import { deserializeSave, serializeSave, SAVE_VERSION } from "@/game/save/save";
import { createInitialState } from "@/game/simulation/GameState";
import { formatDistance, formatNumber, formatCoins } from "@/lib/format";
import { stationName } from "@/game/content/stations";

describe("save format", () => {
  it("round-trips state", () => {
    const st = createInitialState();
    st.coins = 1234.5;
    st.levels.gang = 3;
    st.laid = 99;
    const res = deserializeSave(serializeSave(st, 1000));
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.state).toEqual(st);
      expect(res.savedAt).toBe(1000);
    }
  });

  it("detects corruption and rejects junk / future versions", () => {
    const raw = serializeSave(createInitialState());
    expect(deserializeSave(raw.replace('"coins":0', '"coins":999')).ok).toBe(false);
    expect(deserializeSave("not json").ok).toBe(false);
    const env = JSON.parse(raw);
    env.v = SAVE_VERSION + 1;
    expect(deserializeSave(JSON.stringify(env)).ok).toBe(false);
  });

  it("fills fields missing from older saves", () => {
    const st = createInitialState() as unknown as Record<string, unknown>;
    delete st.stats;
    (st.levels as Record<string, number>) = { shovel: 2 } as never;
    const json = JSON.stringify(st);
    // Build a valid envelope around the partial state.
    const env = JSON.parse(serializeSave(createInitialState()));
    env.state = JSON.parse(json);
    env.checksum = JSON.parse(serializeSave(env.state)).checksum;
    const res = deserializeSave(JSON.stringify(env));
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.state.levels.shovel).toBe(2);
      expect(res.state.levels.gang).toBe(0);
      expect(res.state.stats.clicks).toBe(0);
    }
  });
});

describe("formatting", () => {
  it("formats with suffixes", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(999)).toBe("999");
    expect(formatNumber(1500)).toBe("1.50K");
    expect(formatNumber(2_340_000)).toBe("2.34M");
    expect(formatNumber(999_999)).toBe("1.00M");
    expect(formatNumber(1e40)).toMatch(/e40$/);
    expect(formatCoins(12.9)).toBe("$12");
  });

  it("formats distance in m, then Km", () => {
    expect(formatDistance(0)).toBe("0 m");
    expect(formatDistance(999.9)).toBe("999 m");
    expect(formatDistance(1000)).toBe("1 Km");
    expect(formatDistance(1254)).toBe("1.25 Km");
    expect(formatDistance(12_540)).toBe("12.5 Km");
    expect(formatDistance(125_400)).toBe("125 Km");
    expect(formatDistance(1_500_000)).toBe("1.50K Km");
  });

  it("names stations, cycling with numerals", () => {
    expect(stationName(0)).toBe("Millbrook");
    expect(stationName(20)).toBe("Millbrook II");
  });
});
