import { describe, expect, it } from "vitest";
import { Route, SEA_LEVEL } from "@/game/simulation/route";

describe("Route", () => {
  const route = new Route(42);

  it("starts at the origin and is deterministic per seed", () => {
    expect(route.z(0)).toBeCloseTo(0, 6);
    expect(new Route(42).pointAt(123).z).toBe(route.pointAt(123).z);
    expect(new Route(43).pointAt(123).z).not.toBeCloseTo(route.pointAt(123).z, 3);
  });

  it("is parameterised by arc length (consecutive samples are ~1 unit apart)", () => {
    for (let s = 0; s < 2000; s += 37) {
      const a = route.pointAt(s);
      const b = route.pointAt(s + 1);
      expect(Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)).toBeCloseTo(1, 2);
    }
  });

  it("is continuous with unit forward vectors and gentle grades", () => {
    let prev = route.pointAt(0);
    for (let s = 0.5; s < 3000; s += 0.5) {
      const p = route.pointAt(s);
      expect(Math.hypot(p.x - prev.x, p.y - prev.y, p.z - prev.z)).toBeLessThan(0.51);
      expect(Math.hypot(p.dx, p.dy, p.dz)).toBeCloseTo(1, 6);
      expect(Math.abs(p.dy)).toBeLessThan(0.08);
      prev = p;
    }
  });

  it("keeps the track bed above sea level", () => {
    for (let x = 0; x < 20000; x += 13) expect(route.y(x)).toBeGreaterThan(SEA_LEVEL + 1);
  });
});
