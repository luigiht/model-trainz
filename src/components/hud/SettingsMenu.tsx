"use client";

import { useState } from "react";
import { GameDialog } from "./GameDialog";
import { SettingsDialog } from "./SettingsDialog";
import { PixelIcon } from "./PixelIcon";
import { resetGame } from "@/game/state/game";

const BUTTON =
  "panel grid place-items-center px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-amber-300 compact:size-11 compact:px-0 compact:py-0";
const ICON = "hidden size-5 text-amber-200 compact:block";

/** Top-right controls: game info, settings and a guarded progress reset (icons on compact screens). */
export function SettingsMenu() {
  const [confirming, setConfirming] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [gameOpen, setGameOpen] = useState(false);

  return (
    <div className="font-body flex flex-wrap items-center justify-end gap-2 compact:flex-nowrap compact:portrait:flex-col">
      <button
        className={BUTTON}
        onClick={() => setGameOpen(true)}
        aria-haspopup="dialog"
        aria-label="Game"
        title="Game"
        data-testid="game"
      >
        <PixelIcon name="card" className={ICON} />
        <span className="compact:hidden">Game</span>
      </button>
      <GameDialog open={gameOpen} onClose={() => setGameOpen(false)} />
      <button
        className={BUTTON}
        onClick={() => setSettingsOpen(true)}
        aria-haspopup="dialog"
        aria-label="Settings"
        title="Settings"
        data-testid="settings"
      >
        <PixelIcon name="gear" className={ICON} />
        <span className="compact:hidden">Settings</span>
      </button>
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <div className="relative compact:size-11">
        {confirming ? (
          <span className="panel flex items-center gap-2 px-3 py-2 text-sm compact:absolute compact:right-0 compact:top-0 compact:z-10 compact:whitespace-nowrap">
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
            className={BUTTON}
            onClick={() => setConfirming(true)}
            aria-label="Reset progress"
            title="Reset progress"
            data-testid="reset"
          >
            <PixelIcon name="reset" className={ICON} />
            <span className="compact:hidden">Reset</span>
          </button>
        )}
      </div>
    </div>
  );
}
