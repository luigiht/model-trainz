"use client";

import { useEffect, useRef, useState } from "react";
import { useSession, type SyncStatus } from "@/game/session/session";

const SYNC_TEXT: Record<SyncStatus, string> = {
  idle: "Not saved online yet.",
  saving: "Saving online…",
  saved: "Saved online.",
  offline: "Can't reach the server right now, so progress is saved on this device for now.",
};

const BUTTON =
  "shrink-0 rounded border border-amber-500/60 px-3 py-1.5 text-sm hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-amber-300";

/** The player's name and this game's ID, to continue it elsewhere. Native modal <dialog>. */
export function GameDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const idText = useRef<HTMLElement>(null);
  const name = useSession((s) => s.name);
  const gameId = useSession((s) => s.gameId);
  const sync = useSession((s) => s.sync);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(gameId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // No clipboard access: select the ID so it can be copied by hand.
      if (idText.current) window.getSelection()?.selectAllChildren(idText.current);
    }
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="panel m-auto w-[min(28rem,calc(100vw-1.5rem))] p-0 text-amber-50 backdrop:bg-black/50"
      aria-labelledby="game-title"
      data-testid="game-dialog"
    >
      <div className="flex max-h-[calc(100dvh-3rem)] flex-col gap-4 overflow-y-auto p-5">
        <header className="flex items-center justify-between">
          <h2 id="game-title" className="font-body text-lg text-amber-300">
            Game
          </h2>
          <button
            onClick={onClose}
            className="rounded px-2 py-1 text-sm hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-amber-300"
            aria-label="Close game panel"
          >
            Close ✕
          </button>
        </header>

        <dl className="flex flex-col gap-4">
          <div>
            <dt className="font-pixel mb-1 text-xs text-amber-200">Player</dt>
            <dd className="font-body text-base" data-testid="game-player">
              {name}
            </dd>
          </div>
          <div>
            <dt className="font-pixel mb-1 text-xs text-amber-200">Game ID</dt>
            <dd className="flex items-center justify-between gap-3">
              <code
                ref={idText}
                className="font-mono text-xl tracking-wider text-amber-100"
                data-testid="game-id"
              >
                {gameId}
              </code>
              <button className={BUTTON} onClick={copyId}>
                {copied ? "Copied!" : "Copy ID"}
              </button>
            </dd>
          </div>
        </dl>
        <span className="sr-only" aria-live="polite">
          {copied ? "Game ID copied to the clipboard." : ""}
        </span>

        <p className="text-sm text-amber-100/80">
          Keep this Game ID to continue this game on any device: enter it on the start screen. The
          address bar also includes it, so a bookmark brings you straight back. Anyone with the ID
          can play this game.
        </p>
        <p role="status" className="text-xs text-amber-100/60">
          {SYNC_TEXT[sync]}
        </p>
      </div>
    </dialog>
  );
}
