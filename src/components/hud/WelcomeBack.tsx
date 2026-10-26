"use client";

import { useEffect, useRef } from "react";
import { useAway } from "@/game/state/game";
import { formatCoins, formatNumber } from "@/lib/format";

function duration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m` : `${Math.floor(seconds)}s`;
}

/** Offline-progress summary, using the native (accessible, focus-trapping) <dialog>. */
export function WelcomeBack() {
  const { summary, dismiss } = useAway();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (summary && !d.open) d.showModal();
    if (!summary && d.open) d.close();
  }, [summary]);

  return (
    <dialog
      ref={ref}
      onClose={dismiss}
      className="panel m-auto max-w-sm p-5 text-amber-50 backdrop:bg-black/50"
      aria-labelledby="welcome-title"
    >
      {summary && (
        <>
          <h2 id="welcome-title" className="font-pixel text-lg text-amber-300">
            Welcome back!
          </h2>
          <p className="mt-2 text-sm">
            While you were away for {duration(summary.seconds)}, your track gang laid{" "}
            {formatNumber(summary.pieces)} pieces
            {summary.stations > 0 && (
              <>
                {" "}
                and the train reached {summary.stations} new station
                {summary.stations === 1 ? "" : "s"}
              </>
            )}
            .
          </p>
          <p className="font-pixel mt-3 text-2xl text-amber-300">+{formatCoins(summary.coins)}</p>
          <form method="dialog" className="mt-4 text-right">
            <button
              className="rounded bg-amber-500 px-4 py-2 font-semibold text-black hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-amber-200"
              autoFocus
            >
              Full steam ahead
            </button>
          </form>
        </>
      )}
    </dialog>
  );
}
