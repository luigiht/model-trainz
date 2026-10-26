"use client";

import { QUALITY_LEVELS, type QualitySetting } from "@/render/effects/quality";
import { useActiveQualityLevel, useSettingsStore } from "@/game/state/settingsStore";

const OPTIONS: QualitySetting[] = ["auto", ...QUALITY_LEVELS];

/** Minimal graphics-quality picker (M0). Superseded by the full settings panel in M9. */
export function QualityMenu() {
  const quality = useSettingsStore((s) => s.quality);
  const setQuality = useSettingsStore((s) => s.setQuality);
  const active = useActiveQualityLevel();

  return (
    <label className="panel flex items-center gap-2 px-3 py-2 text-sm">
      <span className="font-pixel text-xs text-amber-200">Quality</span>
      <select
        data-testid="quality-select"
        className="rounded bg-black/40 px-2 py-1 text-amber-50 focus-visible:outline-2 focus-visible:outline-amber-300"
        value={quality}
        onChange={(e) => setQuality(e.target.value as QualitySetting)}
      >
        {OPTIONS.map((o) => (
          <option key={o} value={o}>
            {o === "auto" ? `Auto (${active})` : o[0].toUpperCase() + o.slice(1)}
          </option>
        ))}
      </select>
    </label>
  );
}
