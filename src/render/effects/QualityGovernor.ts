import { stepQuality, type QualityLevel } from "./quality";

/**
 * Auto-quality governor. Feed it frame times; it answers with a level change when the rolling
 * average stays outside the comfort band for a full window. Pure and allocation-free per sample.
 */
export interface GovernorOptions {
  /** Average frame time (ms) above which quality drops. ~50 FPS. */
  downshiftMs: number;
  /** Average frame time (ms) below which quality may rise. ~80 FPS. */
  upshiftMs: number;
  /** Samples per evaluation window. */
  windowSize: number;
  /** Windows to wait after any change before evaluating again (lets the GPU settle). */
  cooldownWindows: number;
}

export const DEFAULT_GOVERNOR_OPTIONS: GovernorOptions = {
  downshiftMs: 20,
  upshiftMs: 12.5,
  windowSize: 120,
  cooldownWindows: 2,
};

export class QualityGovernor {
  private sum = 0;
  private count = 0;
  private cooldown: number;
  /** After a downshift, never climb back above this level (prevents oscillation). */
  private ceiling: QualityLevel = "ultra";

  constructor(
    public level: QualityLevel,
    private readonly opts: GovernorOptions = DEFAULT_GOVERNOR_OPTIONS,
  ) {
    this.cooldown = opts.cooldownWindows;
  }

  /** Returns the new level if it changed, otherwise null. */
  sample(frameMs: number): QualityLevel | null {
    // Clamp hitches (tab switches, GC, shader compiles) so a single spike can't drop quality.
    this.sum += Math.min(frameMs, this.opts.downshiftMs * 2);
    this.count++;
    if (this.count < this.opts.windowSize) return null;

    const avg = this.sum / this.count;
    this.sum = 0;
    this.count = 0;
    if (this.cooldown > 0) {
      this.cooldown--;
      return null;
    }

    let next = this.level;
    if (avg > this.opts.downshiftMs) {
      next = stepQuality(this.level, -1);
      this.ceiling = next;
    } else if (avg < this.opts.upshiftMs && this.level !== this.ceiling) {
      next = stepQuality(this.level, 1);
    }
    if (next === this.level) return null;
    this.level = next;
    this.cooldown = this.opts.cooldownWindows;
    return next;
  }
}
