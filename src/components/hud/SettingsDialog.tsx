"use client";

import { useEffect, useRef } from "react";
import type { QualitySetting } from "@/render/effects/quality";
import { useActiveQualityLevel, useSettingsStore } from "@/game/state/settingsStore";
import { sfx } from "@/audio/sfx";

const QUALITY_OPTIONS: { value: QualitySetting; label: string; hint: string }[] = [
  { value: "auto", label: "Auto", hint: "Adjusts to your device" },
  { value: "low", label: "Low", hint: "No shadows or effects" },
  { value: "medium", label: "Medium", hint: "Shadows + bloom" },
  { value: "high", label: "High", hint: "Adds ambient occlusion" },
  { value: "ultra", label: "Ultra", hint: "Sharpest shadows" },
];

const CONTROLS: [string, string][] = [
  ["Click / tap the scene", "Lay a piece of track"],
  ["Hold mouse / finger", "Keep laying track"],
  ["Space (hold to repeat)", "Lay track"],
  ["Lay track button", "Lay track"],
  ["Mouse wheel", "Zoom the camera"],
  ["`  (backtick)", "Toggle the debug overlay"],
  ["Esc", "Close this panel"],
];

const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1);

/** Settings panel: sound, graphics quality, and a controls reference. Native modal <dialog>. */
export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const muted = useSettingsStore((s) => s.muted);
  const volume = useSettingsStore((s) => s.volume);
  const quality = useSettingsStore((s) => s.quality);
  const setMuted = useSettingsStore((s) => s.setMuted);
  const setVolume = useSettingsStore((s) => s.setVolume);
  const setQuality = useSettingsStore((s) => s.setQuality);
  const active = useActiveQualityLevel();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // Click on the backdrop (outside the panel) closes.
        if (e.target === e.currentTarget) onClose();
      }}
      className="panel m-auto w-[min(30rem,calc(100vw-1.5rem))] p-0 text-amber-50 backdrop:bg-black/50"
      aria-labelledby="settings-title"
      data-testid="settings-dialog"
    >
      <div className="flex max-h-[calc(100dvh-3rem)] flex-col gap-5 overflow-y-auto p-5">
        <header className="flex items-center justify-between">
          <h2 id="settings-title" className="font-pixel text-lg text-amber-300">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="rounded px-2 py-1 text-sm hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-amber-300"
            aria-label="Close settings"
          >
            Close ✕
          </button>
        </header>

        <section aria-labelledby="settings-sound">
          <h3 id="settings-sound" className="font-pixel mb-2 text-xs text-amber-200">
            Sound
          </h3>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-amber-400"
                checked={!muted}
                onChange={(e) => setMuted(!e.target.checked)}
                data-testid="settings-sound-toggle"
              />
              Sound effects
            </label>
            <label className="flex flex-1 items-center gap-3 text-sm">
              <span className="shrink-0">Volume</span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={Math.round(volume * 100)}
                disabled={muted}
                onChange={(e) => setVolume(Number(e.target.value) / 100)}
                onPointerUp={() => sfx.coin()}
                onKeyUp={() => sfx.coin()}
                className="flex-1 accent-amber-400 disabled:opacity-40"
                aria-valuetext={`${Math.round(volume * 100)}%`}
                data-testid="settings-volume"
              />
              <span className="w-10 text-right font-mono text-xs text-amber-100/70">
                {Math.round(volume * 100)}%
              </span>
            </label>
          </div>
        </section>

        <section aria-labelledby="settings-quality">
          <h3 id="settings-quality" className="font-pixel mb-2 text-xs text-amber-200">
            Graphics quality
          </h3>
          <div
            role="radiogroup"
            aria-labelledby="settings-quality"
            className="grid grid-cols-2 gap-2 sm:grid-cols-5"
          >
            {QUALITY_OPTIONS.map((o) => {
              const selected = quality === o.value;
              return (
                <button
                  key={o.value}
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setQuality(o.value)}
                  data-testid={`quality-${o.value}`}
                  className={`rounded-md border px-2 py-2 text-left text-sm transition focus-visible:outline-2 focus-visible:outline-amber-300 ${
                    selected
                      ? "border-amber-400 bg-amber-700/50"
                      : "border-white/10 bg-black/20 hover:bg-white/10"
                  }`}
                >
                  <span className="block font-semibold">{o.label}</span>
                  <span className="block text-[11px] leading-tight text-amber-100/60">
                    {o.value === "auto" ? `Now: ${capitalize(active)}` : o.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="settings-controls">
          <h3 id="settings-controls" className="font-pixel mb-2 text-xs text-amber-200">
            Controls
          </h3>
          <table className="w-full rounded-md bg-black/25 text-sm">
            <tbody>
              {CONTROLS.map(([input, action]) => (
                <tr key={input} className="border-b border-white/5 last:border-0">
                  <th
                    scope="row"
                    className="px-3 py-1.5 text-left font-mono text-xs font-normal text-amber-300"
                  >
                    {input}
                  </th>
                  <td className="px-3 py-1.5 text-amber-50/90">{action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </dialog>
  );
}
