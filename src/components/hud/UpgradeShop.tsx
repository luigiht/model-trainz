"use client";

import { useState } from "react";
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

/** The upgrade shop. Collapses to a toggle on small screens. */
export function UpgradeShop() {
  const { coins, levels } = useHud(useShallow((s) => ({ coins: s.coins, levels: s.levels })));
  const [open, setOpen] = useState(false);

  return (
    <section
      className="panel flex max-h-[calc(100dvh-1.5rem)] w-[min(20rem,calc(100vw-1.5rem))] flex-col"
      aria-label="Upgrades"
    >
      <button
        className="font-pixel flex items-center justify-between px-3 py-2 text-left text-sm text-amber-300 focus-visible:outline-2 focus-visible:outline-amber-300 md:pointer-events-none"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        Upgrades
        <span className="text-xs text-amber-100/60 md:hidden">{open ? "hide" : "show"}</span>
      </button>
      <ul
        className={`${open ? "flex" : "hidden"} flex-col gap-2 overflow-y-auto px-3 pb-3 md:flex`}
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
                className={`group flex w-full items-start gap-3 rounded-md border p-2 text-left transition focus-visible:outline-2 focus-visible:outline-amber-300 ${
                  affordable
                    ? "border-amber-500/60 bg-amber-900/30 hover:bg-amber-800/40 active:scale-[0.98]"
                    : "border-white/10 bg-black/20 opacity-70"
                }`}
              >
                <span
                  aria-hidden
                  className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded font-pixel text-xs text-black/80 ${BADGE[u.id]}`}
                >
                  {level}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-amber-50">{u.name}</span>
                    <span
                      className={`shrink-0 font-mono text-xs ${affordable ? "text-amber-300" : "text-amber-100/50"}`}
                    >
                      {maxed ? "MAX" : formatCoins(cost)}
                    </span>
                  </span>
                  <span className="block text-xs text-amber-100/80">{u.effect}</span>
                  <span className="block text-[11px] italic text-amber-100/45">{u.flavor}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
