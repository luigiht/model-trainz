import { describe, expect, it } from "vitest";
import { QUALITY_TIERS, resolveDpr, resolveEffects, stepQuality } from "@/render/effects/quality";
import { QualityGovernor } from "@/render/effects/QualityGovernor";

const allOn = { shadows: true, ssao: true, bloom: true, tiltShift: true };

describe("quality tiers", () => {
  it("user toggles can only remove effects", () => {
    expect(resolveEffects("low", allOn).ssao).toBe(false);
    expect(resolveEffects("high", allOn).ssao).toBe(true);
    expect(resolveEffects("high", { ...allOn, ssao: false }).ssao).toBe(false);
    expect(resolveEffects("ultra", { ...allOn, shadows: false }).shadows).toBe(false);
  });

  it("tiers are monotonic in cost", () => {
    expect(QUALITY_TIERS.low.maxDpr).toBeLessThan(QUALITY_TIERS.ultra.maxDpr);
    expect(QUALITY_TIERS.medium.shadowMapSize).toBeLessThan(QUALITY_TIERS.high.shadowMapSize);
  });

  it("dpr respects device, tier cap and resolution scale", () => {
    expect(resolveDpr("ultra", 1, 3)).toBe(1.75);
    expect(resolveDpr("ultra", 1, 1)).toBe(1);
    expect(resolveDpr("high", 0.5, 2)).toBe(0.75);
    expect(resolveDpr("low", 0.1, 1)).toBe(0.5);
  });

  it("stepQuality clamps at the ends", () => {
    expect(stepQuality("low", -1)).toBe("low");
    expect(stepQuality("ultra", 1)).toBe("ultra");
    expect(stepQuality("medium", 1)).toBe("high");
  });
});

describe("QualityGovernor", () => {
  const opts = { downshiftMs: 20, upshiftMs: 12, windowSize: 10, cooldownWindows: 0 };

  it("downshifts on sustained slow frames and won't climb back above the new ceiling", () => {
    const g = new QualityGovernor("high", opts);
    let change = null;
    for (let i = 0; i < 10; i++) change = g.sample(30) ?? change;
    expect(change).toBe("medium");
    for (let i = 0; i < 50; i++) g.sample(5);
    expect(g.level).toBe("medium");
  });

  it("upshifts on sustained fast frames", () => {
    const g = new QualityGovernor("medium", opts);
    for (let i = 0; i < 10; i++) g.sample(6);
    expect(g.level).toBe("high");
  });

  it("ignores single spikes", () => {
    const g = new QualityGovernor("medium", opts);
    g.sample(5000);
    for (let i = 0; i < 9; i++) g.sample(14);
    expect(g.level).toBe("medium");
  });
});
