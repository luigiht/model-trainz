"use client";

import { useEffect, useState } from "react";

const TIPS = [
  "Tip: hold the mouse button (or Space) to keep shoveling coal.",
  "Tip: a perfect stop at a station pays a bonus. Brake early, brake gently.",
  "Tip: press V to hop between the cab and the diorama view.",
  "Tip: press ` to show the debug overlay.",
  "Tip: cows are not fond of whistles. Use that knowledge wisely.",
];

/** Full-screen loader with a little CSS voxel train chugging along. */
export function LoadingScreen({ visible }: { visible: boolean }) {
  const [tip, setTip] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTip((t) => (t + 1) % TIPS.length), 3500);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-hidden={!visible}
      className={`absolute inset-0 z-40 flex flex-col items-center justify-center gap-8 bg-[#1b1712] text-amber-100 transition-opacity duration-700 ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <h1 className="font-pixel text-2xl tracking-wide text-amber-300 sm:text-4xl">
        Rail Baron Clicker
      </h1>
      <div className="loading-train relative h-16 w-64" aria-hidden>
        <div className="loading-train__body" />
        <div className="loading-train__track" />
      </div>
      <p className="max-w-sm px-6 text-center text-sm text-amber-100/80">
        <span className="sr-only">Loading. </span>
        {TIPS[tip]}
      </p>
    </div>
  );
}
