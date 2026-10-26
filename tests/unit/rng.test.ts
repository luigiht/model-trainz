import { describe, expect, it } from "vitest";
import { hash3, hash3f, mulberry32, seedFromString } from "@/lib/rng";

describe("seeded rng", () => {
  it("is deterministic for a seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });

  it("differs between seeds and stays in [0,1)", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    let same = 0;
    for (let i = 0; i < 1000; i++) {
      const x = a();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      if (x === b()) same++;
    }
    expect(same).toBe(0);
  });

  it("hash3 is stable and well spread", () => {
    expect(hash3(1, 2, 3)).toBe(hash3(1, 2, 3));
    expect(hash3(1, 2, 3)).not.toBe(hash3(3, 2, 1));
    let sum = 0;
    for (let i = 0; i < 4096; i++) sum += hash3f(i % 16, (i >> 4) % 16, i >> 8);
    expect(sum / 4096).toBeGreaterThan(0.45);
    expect(sum / 4096).toBeLessThan(0.55);
  });

  it("seedFromString is stable", () => {
    expect(seedFromString("rail")).toBe(seedFromString("rail"));
    expect(seedFromString("rail")).not.toBe(seedFromString("baron"));
  });
});
