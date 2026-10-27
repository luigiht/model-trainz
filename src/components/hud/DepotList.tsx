"use client";

import { useShallow } from "zustand/react/shallow";
import { TRAIN_SETS } from "@/game/content/trainSets";
import { playerDepot, useHud } from "@/game/state/game";
import { useMessages } from "@/i18n/i18n";
import { formatCoins } from "@/lib/format";
import { sfx } from "@/audio/sfx";

/** Depot: buy a faster, better-paying train set or swap back to one already owned. */
export function DepotList({ id, hidden }: { id: string; hidden: boolean }) {
  const { coins, trainSet, ownedSets } = useHud(
    useShallow((s) => ({ coins: s.coins, trainSet: s.trainSet, ownedSets: s.ownedSets })),
  );
  const t = useMessages();

  return (
    <ul
      id={id}
      role="tabpanel"
      aria-label={t.shop.depot}
      className={`${hidden ? "hidden" : "flex"} flex-col gap-1.5 overflow-y-auto px-2.5 pb-2.5 [@media(max-height:520px)]:gap-1`}
    >
      {TRAIN_SETS.map((set) => {
        const owned = ownedSets.includes(set.id);
        const active = trainSet === set.id;
        const affordable = owned || coins >= set.price;
        const status = active ? t.depot.inService : owned ? t.depot.use : formatCoins(set.price);
        const text = t.trainSets[set.id];
        return (
          <li key={set.id}>
            <button
              data-testid={`depot-${set.id}`}
              disabled={active || !affordable}
              aria-pressed={active}
              onClick={(e) => {
                if (playerDepot(set.id)) {
                  if (owned) sfx.coin();
                  else sfx.buy();
                }
                if (e.detail > 0) e.currentTarget.blur();
              }}
              className={`flex w-full items-start gap-2 rounded-md border px-2 py-1.5 text-left transition focus-visible:outline-2 focus-visible:outline-amber-300 ${
                active
                  ? "border-emerald-400/70 bg-emerald-900/30"
                  : affordable
                    ? "border-amber-500/60 bg-amber-900/30 hover:bg-amber-800/40 active:scale-[0.98]"
                    : "border-white/10 bg-black/20 opacity-70"
              }`}
            >
              <span
                aria-hidden
                className="mt-0.5 grid h-6 w-6 shrink-0 grid-rows-3 overflow-hidden rounded"
              >
                {set.livery.map((c) => (
                  <span key={c} style={{ background: c }} />
                ))}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="font-body min-w-0 text-sm leading-tight text-amber-50">
                    {text.name}
                  </span>
                  <span
                    className={`shrink-0 font-mono text-xs ${
                      active
                        ? "text-emerald-300"
                        : affordable
                          ? "text-amber-300"
                          : "text-amber-100/50"
                    }`}
                  >
                    {status}
                  </span>
                </span>
                <span className="block text-xs leading-tight text-amber-100/80">{text.detail}</span>
                <span className="block text-xs italic leading-tight text-amber-100/45 [@media(max-height:600px)]:hidden">
                  {text.flavor}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
