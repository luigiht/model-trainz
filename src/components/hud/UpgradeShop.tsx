"use client";

import { useState, useSyncExternalStore } from "react";
import { useShallow } from "zustand/react/shallow";
import { UPGRADES } from "@/game/content/upgrades";
import { isMaxed, upgradeCost } from "@/game/economy/economy";
import { playerBuy, useHud } from "@/game/state/game";
import { useMessages } from "@/i18n/i18n";
import { formatCoins } from "@/lib/format";
import { sfx } from "@/audio/sfx";
import { DepotList } from "./DepotList";
import { PixelIcon } from "./PixelIcon";

const BADGE: Record<string, string> = {
  shovel: "bg-amber-600",
  steel: "bg-slate-400",
  gang: "bg-orange-500",
  boiler: "bg-red-600",
  fares: "bg-emerald-600",
  carriage: "bg-rose-800",
  golden: "bg-yellow-400",
};

/** Same breakpoint as the `compact:` variant in globals.css. */
const COMPACT = "(max-width: 767px), (max-height: 500px)";
const subscribeCompact = (cb: () => void) => {
  const mq = window.matchMedia(COMPACT);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

/**
 * The shop: Upgrades and Depot tabs. On compact screens it is a drawer docked to the right edge,
 * pulled in and out by a tab, and starts closed.
 */
export function UpgradeShop() {
  const { coins, levels } = useHud(useShallow((s) => ({ coins: s.coins, levels: s.levels })));
  const t = useMessages();
  const compact = useSyncExternalStore(
    subscribeCompact,
    () => window.matchMedia(COMPACT).matches,
    () => false,
  );
  const [userOpen, setOpen] = useState<boolean | null>(null);
  const open = userOpen ?? !compact;
  // The drawer slides away whole, so its lists stay rendered while closed.
  const showLists = open || compact;
  const [tab, setTab] = useState<"upgrades" | "depot">("upgrades");
  const panelId = tab === "upgrades" ? "upgrade-list" : "depot-list";

  return (
    <div
      className={`relative flex max-h-full transition-transform duration-300 ease-out ${
        compact && !open ? "translate-x-full" : ""
      }`}
    >
      {compact && (
        <button
          data-testid="shop-handle"
          aria-expanded={open}
          aria-controls="shop"
          onClick={(e) => {
            setOpen(!open);
            if (e.detail > 0) e.currentTarget.blur();
          }}
          className="panel absolute right-full top-1/2 flex -translate-y-1/2 flex-col items-center gap-2 rounded-r-none! border-r-0! px-2 py-3 text-amber-200 focus-visible:outline-2 focus-visible:outline-amber-300"
        >
          <PixelIcon name="chevronLeft" className={`h-3.5 w-2.5 ${open ? "rotate-180" : ""}`} />
          <span className="font-body rotate-180 text-sm [writing-mode:vertical-rl]">
            {t.shop.upgrades}
          </span>
        </button>
      )}
      <section
        id="shop"
        inert={compact && !open}
        className={`panel flex max-h-full flex-col ${
          compact
            ? "w-[min(20rem,calc(100vw-3.5rem))] rounded-r-none! border-r-0!"
            : "w-[min(20rem,calc(100vw-1.5rem))]"
        }`}
        aria-label={t.shop.label}
      >
        <div className="flex items-center justify-between px-2.5 py-1.5">
          <div role="tablist" aria-label={t.shop.label} className="flex gap-3">
            {(
              [
                ["upgrades", t.shop.upgrades, "upgrade-list"],
                ["depot", t.shop.depot, "depot-list"],
              ] as const
            ).map(([value, label, controls]) => (
              <button
                key={value}
                role="tab"
                aria-selected={tab === value}
                aria-controls={controls}
                data-testid={`tab-${value}`}
                onClick={(e) => {
                  setTab(value);
                  setOpen(true);
                  if (e.detail > 0) e.currentTarget.blur();
                }}
                className={`font-body rounded text-sm underline-offset-4 focus-visible:outline-2 focus-visible:outline-amber-300 ${
                  tab === value
                    ? "text-amber-300 underline decoration-2"
                    : "text-amber-100/60 hover:text-amber-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {!compact && (
            <button
              className="flex items-center gap-1 rounded text-xs text-amber-100/70 underline-offset-2 hover:text-amber-100 hover:underline focus-visible:outline-2 focus-visible:outline-amber-300"
              onClick={(e) => {
                setOpen(!open);
                if (e.detail > 0) e.currentTarget.blur();
              }}
              aria-expanded={open}
              aria-controls={panelId}
            >
              {open ? t.shop.hide : t.shop.show}
              <svg
                aria-hidden
                viewBox="0 0 12 12"
                className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
              >
                <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.75" />
              </svg>
            </button>
          )}
        </div>
        <ul
          id="upgrade-list"
          role="tabpanel"
          aria-label={t.shop.upgrades}
          className={`${showLists && tab === "upgrades" ? "flex" : "hidden"} flex-col gap-1.5 overflow-y-auto overscroll-contain px-2.5 pb-2.5 [@media(max-height:520px)]:gap-1`}
        >
          {UPGRADES.map((u) => {
            const level = levels[u.id];
            const maxed = isMaxed(u.id, level);
            const cost = upgradeCost(u.id, level);
            const affordable = !maxed && coins >= cost;
            const text = t.upgrades[u.id];
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
                      <span className="font-body truncate text-sm text-amber-50">{text.name}</span>
                      <span
                        className={`shrink-0 font-mono text-xs ${affordable ? "text-amber-300" : "text-amber-100/50"}`}
                      >
                        {maxed ? t.shop.max : formatCoins(cost)}
                      </span>
                    </span>
                    <span className="block text-xs leading-tight text-amber-100/80">
                      {text.detail}
                    </span>
                    <span className="block text-xs italic leading-tight text-amber-100/45 [@media(max-height:600px)]:hidden">
                      {text.flavor}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <DepotList id="depot-list" hidden={!showLists || tab !== "depot"} />
      </section>
    </div>
  );
}
