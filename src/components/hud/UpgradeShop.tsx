"use client";

import { useState, useSyncExternalStore } from "react";
import { useShallow } from "zustand/react/shallow";
import { UPGRADES } from "@/game/content/upgrades";
import { isMaxed, upgradeCost } from "@/game/economy/economy";
import { playerBuy, useHud } from "@/game/state/game";
import { formatCoins } from "@/lib/format";
import { sfx } from "@/audio/sfx";

const BADGE: Record<string, string> = {
  shovel: "bg-amber-600",
  steel: "bg-slate-400",
  gang: "bg-orange-500",
  boiler: "bg-red-600",
  fares: "bg-emerald-600",
  carriage: "bg-rose-800",
  golden: "bg-yellow-400",
};

const WIDE = "(min-width: 768px)";
const subscribeWide = (cb: () => void) => {
  const mq = window.matchMedia(WIDE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

/** The upgrade shop. Starts collapsed on small screens. */
export function UpgradeShop() {
  const { coins, levels } = useHud(useShallow((s) => ({ coins: s.coins, levels: s.levels })));
  const wide = useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE).matches,
    () => true,
  );
  const [userOpen, setOpen] = useState<boolean | null>(null);
  const open = userOpen ?? wide;

  return (
    <section
      className="panel flex max-h-full w-[min(20rem,calc(100vw-1.5rem))] flex-col"
      aria-label="Upgrades"
    >
      <div className="flex items-center justify-between px-2.5 py-1.5">
        <h2 className="font-body text-sm text-amber-300">Upgrades</h2>
        <button
          className="flex items-center gap-1 rounded text-xs text-amber-100/70 underline-offset-2 hover:text-amber-100 hover:underline focus-visible:outline-2 focus-visible:outline-amber-300"
          onClick={(e) => {
            setOpen(!open);
            if (e.detail > 0) e.currentTarget.blur();
          }}
          aria-expanded={open}
          aria-controls="upgrade-list"
        >
          {open ? "Hide" : "Show"}
          <svg
            aria-hidden
            viewBox="0 0 12 12"
            className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.75" />
          </svg>
        </button>
      </div>
      <ul
        id="upgrade-list"
        className={`${open ? "flex" : "hidden"} flex-col gap-1.5 overflow-y-auto px-2.5 pb-2.5 [@media(max-height:520px)]:gap-1`}
      >
        {UPGRADES.map((u) => {
          const level = levels[u.id];
          const maxed = isMaxed(u.id, level);
          const cost = upgradeCost(u.id, level);
          const affordable = !maxed && coins >= cost;
          return (
            <li key={u.id}>
              <button
                data-testid={`buy-${u.id}`}
                disabled={!affordable}
                onClick={(e) => {
                  if (playerBuy(u.id)) sfx.buy();
                  // Mouse/touch clicks shouldn't leave focus here, or Space would press this
                  // button instead of laying track. Keyboard activation (detail 0) keeps focus.
                  if (e.detail > 0) e.currentTarget.blur();
                }}
                className={`group flex w-full items-start gap-2 rounded-md border px-2 py-1.5 text-left transition focus-visible:outline-2 focus-visible:outline-amber-300 ${
                  affordable
                    ? "border-amber-500/60 bg-amber-900/30 hover:bg-amber-800/40 active:scale-[0.98]"
                    : "border-white/10 bg-black/20 opacity-70"
                }`}
              >
                <span
                  aria-hidden
                  className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded font-pixel text-xs text-black/80 ${BADGE[u.id]}`}
                >
                  {level}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-body truncate text-sm text-amber-50">{u.name}</span>
                    <span
                      className={`shrink-0 font-mono text-xs ${affordable ? "text-amber-300" : "text-amber-100/50"}`}
                    >
                      {maxed ? "MAX" : formatCoins(cost)}
                    </span>
                  </span>
                  <span className="block text-xs leading-tight text-amber-100/80">{u.effect}</span>
                  <span className="block text-xs italic leading-tight text-amber-100/45 [@media(max-height:600px)]:hidden">
                    {u.flavor}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
