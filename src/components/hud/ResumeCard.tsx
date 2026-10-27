"use client";

import { useState } from "react";
import { chooseAnotherGame, resumeGame, useSession } from "@/game/session/session";

/** Loading-screen card for returning players: continue the remembered game in one click. */
export function ResumeCard() {
  const name = useSession((s) => s.name);
  const gameId = useSession((s) => s.gameId);
  const [busy, setBusy] = useState(false);

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="resume-title"
      aria-describedby="resume-text"
      className="panel flex w-[min(22rem,calc(100vw-3rem))] flex-col items-center gap-3 p-5 text-center"
    >
      <h2 id="resume-title" className="font-body text-lg text-amber-300">
        Welcome back, {name}!
      </h2>
      <p id="resume-text" className="text-sm text-amber-100/85">
        Your railway is waiting right where you left it.
      </p>
      <p className="text-xs text-amber-100/60">
        Game ID <span className="font-mono text-amber-100">{gameId}</span>
      </p>
      <button
        type="button"
        data-testid="resume-continue"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await resumeGame();
        }}
        className="font-body w-full rounded-lg border-2 border-amber-300 bg-gradient-to-b from-amber-400 to-amber-600 px-6 py-2.5 text-sm text-[#2a1a08] shadow-lg transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 disabled:opacity-60"
        autoFocus
      >
        {busy ? "Loading…" : "Continue"}
      </button>
      <button
        type="button"
        data-testid="resume-other"
        onClick={chooseAnotherGame}
        className="rounded text-xs text-amber-100/70 underline underline-offset-2 hover:text-amber-100 focus-visible:outline-2 focus-visible:outline-amber-300"
      >
        Start a new game or enter another Game ID
      </button>
    </section>
  );
}
