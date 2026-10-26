/**
 * Tiny procedural sound effects on the Web Audio API (no assets). The context is created lazily on
 * the first user gesture (browser autoplay rules) and every call is a no-op while muted or blocked.
 */
import { useSettingsStore } from "@/game/state/settingsStore";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;

function audio(): AudioContext | null {
  if (useSettingsStore.getState().muted) return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function envGain(
  c: AudioContext,
  t: number,
  peak: number,
  attack: number,
  decay: number,
): GainNode {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  g.connect(master!);
  return g;
}

function tone(
  type: OscillatorType,
  freq: number,
  t: number,
  peak: number,
  decay: number,
  endFreq?: number,
) {
  const c = ctx!;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + decay);
  o.connect(envGain(c, t, peak, 0.005, decay));
  o.start(t);
  o.stop(t + decay + 0.05);
}

function noiseBurst(t: number, freq: number, q: number, peak: number, decay: number) {
  const c = ctx!;
  const src = c.createBufferSource();
  src.buffer = noise;
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = freq;
  f.Q.value = q;
  src.connect(f).connect(envGain(c, t, peak, 0.003, decay));
  src.start(t, Math.random() * 0.3);
  src.stop(t + decay + 0.05);
}

export const sfx = {
  /** Metallic clank of a rail being dropped in place. */
  clank() {
    const c = audio();
    if (!c) return;
    const t = c.currentTime;
    const pitch = 0.9 + Math.random() * 0.2;
    noiseBurst(t, 2400 * pitch, 6, 0.5, 0.08);
    tone("square", 520 * pitch, t, 0.06, 0.12, 260 * pitch);
    tone("triangle", 1560 * pitch, t, 0.05, 0.2);
  },
  coin() {
    const c = audio();
    if (!c) return;
    const t = c.currentTime;
    tone("sine", 1320, t, 0.12, 0.08);
    tone("sine", 1760, t + 0.07, 0.12, 0.18);
  },
  golden() {
    const c = audio();
    if (!c) return;
    const t = c.currentTime;
    [1046, 1318, 1568, 2093].forEach((f, i) => tone("triangle", f, t + i * 0.06, 0.12, 0.3));
  },
  whistle() {
    const c = audio();
    if (!c) return;
    const t = c.currentTime;
    for (const f of [587, 698, 880]) {
      const o = c.createOscillator();
      o.type = "triangle";
      o.frequency.setValueAtTime(f * 0.97, t);
      o.frequency.linearRampToValueAtTime(f, t + 0.1);
      o.connect(envGain(c, t, 0.08, 0.06, 0.75));
      o.start(t);
      o.stop(t + 0.9);
    }
    noiseBurst(t, 3500, 1, 0.08, 0.6);
  },
  arrive() {
    const c = audio();
    if (!c) return;
    const t = c.currentTime;
    [784, 988, 1175].forEach((f, i) => tone("sine", f, t + i * 0.12, 0.14, 0.5));
    noiseBurst(t, 1200, 0.7, 0.15, 0.7); // brake hiss
  },
  buy() {
    const c = audio();
    if (!c) return;
    const t = c.currentTime;
    tone("square", 660, t, 0.05, 0.06);
    tone("square", 990, t + 0.06, 0.05, 0.12);
    tone("sine", 1980, t + 0.12, 0.08, 0.25);
  },
};
