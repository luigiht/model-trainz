"use client";

import { useState } from "react";
import { QualityMenu } from "./QualityMenu";
import { useSettingsStore } from "@/game/state/settingsStore";
import { resetGame } from "@/game/state/game";

/** Compact top-right controls: mute, quality, and a guarded progress reset. */
export function SettingsMenu() {
  const muted = useSettingsStore((s) => s.muted);
  const setMuted = useSettingsStore((s) => s.setMuted);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button
        className="panel px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-amber-300"
        onClick={(e) => {
          setMuted(!muted);
          if (e.detail > 0) e.currentTarget.blur();
        }}
        aria-pressed={muted}
        data-testid="mute"
      >
        {muted ? "Sound off" : "Sound on"}
      </button>
      <QualityMenu />
      {confirming ? (
        <span className="panel flex items-center gap-2 px-3 py-2 text-sm">
          Start over?
          <button
            className="rounded bg-red-700 px-2 py-0.5 hover:bg-red-600 focus-visible:outline-2 focus-visible:outline-amber-300"
            onClick={() => {
              resetGame();
              setConfirming(false);
            }}
          >
            Yes, reset
          </button>
          <button
            className="rounded px-2 py-0.5 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-amber-300"
            onClick={() => setConfirming(false)}
            autoFocus
          >
            Cancel
          </button>
        </span>
      ) : (
        <button
          className="panel px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-amber-300"
          onClick={() => setConfirming(true)}
        >
          Reset
        </button>
      )}
    </div>
  );
}
